import json
import uuid
import base64
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import Response
from models.schemas import MeetingCreate, MeetingResponse, MeetingStatus, MeetingNotes
from services.notes import generate_notes, generate_stakeholder_email, analyze_whiteboard
from services.daily import create_room_url
from services.veo import generate_recap_video
from services import db

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.post("/start", response_model=MeetingResponse)
async def start_meeting(body: MeetingCreate):
    # Generate ID first so Daily.co room name matches meeting ID
    meeting_id = str(uuid.uuid4())

    room_url = create_room_url(meeting_id)

    # Persist to Supabase with pre-generated ID
    meeting = await db.create_meeting(
        title=body.title,
        organizer_name=body.organizer_name,
        stakeholder_emails=body.stakeholder_emails,
        daily_room_url=room_url,
        meeting_id=meeting_id,
    )

    return MeetingResponse(
        id=meeting["id"],
        title=meeting["title"],
        status=MeetingStatus.active,
        started_at=meeting["started_at"],
        join_url=room_url,
    )



async def _process_notes_background(meeting_id: str, meeting_title: str):
    """Runs after meeting ends — generates notes and saves to DB."""
    try:
        transcript = await db.get_transcript(meeting_id)
        if not transcript:
            transcript = "No transcript captured."
        notes = await generate_notes(transcript)
        email_body = await generate_stakeholder_email(notes, meeting_title)
        # Delete any previous failed/duplicate notes before saving fresh ones
        from services.db import supabase
        supabase.table("artifacts").delete().eq("meeting_id", meeting_id).eq("type", "notes").execute()
        supabase.table("artifacts").delete().eq("meeting_id", meeting_id).eq("type", "email").execute()
        await db.save_artifact(meeting_id, "notes", notes.model_dump_json())
        await db.save_artifact(meeting_id, "email", email_body)
        await db.save_action_items(meeting_id, [item.model_dump() for item in notes.action_items])
    except Exception as e:
        from services.db import supabase
        supabase.table("artifacts").delete().eq("meeting_id", meeting_id).eq("type", "notes").execute()
        fallback = json.dumps({"summary": f"Notes generation failed: {str(e)}", "key_decisions": [], "action_items": [], "next_steps": ""})
        await db.save_artifact(meeting_id, "notes", fallback)


@router.post("/{meeting_id}/end")
async def end_meeting(meeting_id: str, background_tasks: BackgroundTasks):
    meeting = await db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    await db.end_meeting(meeting_id)

    # Process notes in background — frontend redirects immediately
    background_tasks.add_task(_process_notes_background, meeting_id, meeting["title"])

    return {"message": "Meeting ended. Notes processing in background."}


@router.get("/{meeting_id}/notes")
async def get_notes(meeting_id: str):
    res = await db.get_meeting(meeting_id)
    if not res:
        raise HTTPException(status_code=404, detail="Meeting not found")

    from services.db import supabase
    artifact = supabase.table("artifacts")\
        .select("content")\
        .eq("meeting_id", meeting_id)\
        .eq("type", "notes")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if not artifact.data:
        raise HTTPException(status_code=404, detail="Notes not ready yet")

    return json.loads(artifact.data[0]["content"])


@router.get("/{meeting_id}/status")
async def get_status(meeting_id: str):
    meeting = await db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {
        "id": meeting_id,
        "status": meeting["status"],
        "title": meeting["title"],
        "join_url": meeting.get("daily_room_url"),
    }


@router.post("/{meeting_id}/whiteboard")
async def process_whiteboard(meeting_id: str, body: dict):
    meeting = await db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    result = await analyze_whiteboard(body["image_base64"])
    await db.save_artifact(meeting_id, "whiteboard_doc", json.dumps(result))
    return result


@router.post("/{meeting_id}/transcript")
async def append_transcript(meeting_id: str, body: dict):
    await db.append_transcript(
        meeting_id=meeting_id,
        text=body.get("text", ""),
        speaker_label=body.get("speaker_label", "Speaker"),
    )
    return {"ok": True}


@router.get("/{meeting_id}/transcript")
async def get_transcript(meeting_id: str):
    transcript = await db.get_transcript(meeting_id)
    return {"transcript": transcript}


@router.post("/{meeting_id}/recap-video")
async def create_recap_video(meeting_id: str):
    """Generate a Veo recap video from meeting notes. Run once post-meeting."""
    meeting = await db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    from services.db import supabase
    artifact = supabase.table("artifacts")\
        .select("content")\
        .eq("meeting_id", meeting_id)\
        .eq("type", "notes")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if not artifact.data:
        raise HTTPException(status_code=400, detail="End the meeting first to generate notes")

    notes = json.loads(artifact.data[0]["content"])

    video_bytes = await generate_recap_video(
        meeting_title=meeting["title"],
        summary=notes.get("summary", ""),
        decisions=notes.get("key_decisions", []),
        action_items=[a["task"] for a in notes.get("action_items", [])],
    )

    # Save as base64 artifact
    video_b64 = base64.b64encode(video_bytes).decode()
    await db.save_artifact(meeting_id, "recap_video", video_b64)

    return {"message": "Recap video generated", "size_bytes": len(video_bytes)}


@router.get("/{meeting_id}/recap-video")
async def get_recap_video(meeting_id: str):
    """Stream the generated recap video."""
    from services.db import supabase
    artifact = supabase.table("artifacts")\
        .select("content")\
        .eq("meeting_id", meeting_id)\
        .eq("type", "recap_video")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if not artifact.data:
        raise HTTPException(status_code=404, detail="Recap video not generated yet")

    video_bytes = base64.b64decode(artifact.data[0]["content"])
    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(video_bytes)),
        }
    )
