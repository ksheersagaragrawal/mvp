from fastapi import APIRouter, HTTPException
from models.schemas import QuestionRequest, QuestionResponse
from services.qna import answer_question
from services import db

router = APIRouter(prefix="/api/meetings", tags=["qna"])


@router.post("/{meeting_id}/ask", response_model=QuestionResponse)
async def ask_question(meeting_id: str, body: QuestionRequest):
    """
    Anonymous Q&A — no user identity stored anywhere.
    Returns Einstein's answer as text. TTS is handled by the browser (Web Speech API).
    """
    meeting = await db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript = await db.get_transcript(meeting_id)
    context = "\n".join(transcript.split("\n")[-50:]) if transcript else "Meeting just started, no transcript yet."

    answer = await answer_question(body.question, context)
    saved = await db.save_question(meeting_id, body.question, answer)

    return QuestionResponse(
        question_id=saved["id"],
        answer=answer,
        audio_url=None,
    )


@router.get("/{meeting_id}/answers")
async def get_answers(meeting_id: str):
    """Get all Q&A pairs for the meeting (anonymous)."""
    questions = await db.get_questions(meeting_id)
    return {"answers": questions}
