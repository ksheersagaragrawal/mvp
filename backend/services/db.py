import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)


async def create_meeting(title: str, organizer_name: str, stakeholder_emails: list[str], daily_room_url: str, meeting_id: str = None) -> dict:
    row = {
        "title": title,
        "organizer_name": organizer_name,
        "stakeholder_emails": stakeholder_emails,
        "daily_room_url": daily_room_url,
    }
    if meeting_id:
        row["id"] = meeting_id
    res = supabase.table("meetings").insert(row).execute()
    return res.data[0]


async def get_meeting(meeting_id: str) -> dict:
    res = supabase.table("meetings").select("*").eq("id", meeting_id).single().execute()
    return res.data


async def end_meeting(meeting_id: str) -> dict:
    res = supabase.table("meetings").update({
        "status": "done",
        "ended_at": "now()",
    }).eq("id", meeting_id).execute()
    return res.data[0]


async def append_transcript(meeting_id: str, text: str, speaker_label: str = "Speaker"):
    supabase.table("transcript_chunks").insert({
        "meeting_id": meeting_id,
        "text": text,
        "speaker_label": speaker_label,
    }).execute()


async def get_transcript(meeting_id: str) -> str:
    res = supabase.table("transcript_chunks")\
        .select("text")\
        .eq("meeting_id", meeting_id)\
        .order("created_at")\
        .execute()
    return "\n".join([r["text"] for r in res.data])


async def save_question(meeting_id: str, question: str, answer: str) -> dict:
    res = supabase.table("questions").insert({
        "meeting_id": meeting_id,
        "question_text": question,
        "answer_text": answer,
    }).execute()
    return res.data[0]


async def get_questions(meeting_id: str) -> list:
    res = supabase.table("questions")\
        .select("*")\
        .eq("meeting_id", meeting_id)\
        .order("asked_at")\
        .execute()
    return res.data


async def save_artifact(meeting_id: str, artifact_type: str, content: str):
    supabase.table("artifacts").insert({
        "meeting_id": meeting_id,
        "type": artifact_type,
        "content": content,
    }).execute()


async def save_action_items(meeting_id: str, items: list[dict]):
    if not items:
        return
    rows = [{"meeting_id": meeting_id, **item} for item in items]
    supabase.table("action_items").insert(rows).execute()
