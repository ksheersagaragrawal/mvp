import json
from services.gemini_client import client, FLASH_MODEL, NANO_MODEL
from models.schemas import MeetingNotes, ActionItem


NOTES_PROMPT = """You are Einstein, an AI meeting assistant. Analyze the meeting transcript below and extract:
1. A concise summary (3-5 sentences)
2. Key decisions made
3. Action items with owner labels (use "Speaker 1", "Speaker 2" etc — never real names unless explicitly stated)
4. Next steps

Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "key_decisions": ["string"],
  "action_items": [{"task": "string", "owner_label": "string", "due_date": "string or null"}],
  "next_steps": "string"
}

Transcript:
"""


async def generate_notes(transcript: str) -> MeetingNotes:
    """Generate structured meeting notes from transcript using Nano Banana."""
    response = client.models.generate_content(
        model=NANO_MODEL,
        contents=NOTES_PROMPT + transcript,
        config={"response_mime_type": "application/json"},
    )

    data = json.loads(response.text)
    return MeetingNotes(
        summary=data["summary"],
        key_decisions=data["key_decisions"],
        action_items=[ActionItem(**item) for item in data["action_items"]],
        next_steps=data["next_steps"],
    )


WHITEBOARD_PROMPT = """You are Einstein. The user has shared a whiteboard image from a meeting.
Analyze it and return:
1. A clean Markdown representation of any diagrams, flowcharts, or lists
2. A plain English description of what it represents

Return JSON: {"diagram_markdown": "string", "description": "string"}"""


async def analyze_whiteboard(image_base64: str) -> dict:
    """Analyze whiteboard image and return clean structured doc."""
    response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=[
            {
                "parts": [
                    {"text": WHITEBOARD_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64,
                        }
                    },
                ]
            }
        ],
        config={"response_mime_type": "application/json"},
    )
    return json.loads(response.text)


EMAIL_PROMPT = """You are Einstein. Write a professional meeting summary email to stakeholders.
Use the notes below. Be concise. Sign off as 'Einstein (AI Meeting Co-Pilot)'.

Notes:
"""


async def generate_stakeholder_email(notes: MeetingNotes, meeting_title: str) -> str:
    """Generate a stakeholder email from meeting notes."""
    notes_text = f"""
Meeting: {meeting_title}
Summary: {notes.summary}
Key Decisions: {', '.join(notes.key_decisions)}
Action Items: {[f"{a.task} ({a.owner_label})" for a in notes.action_items]}
Next Steps: {notes.next_steps}
"""
    response = client.models.generate_content(
        model=NANO_MODEL,
        contents=EMAIL_PROMPT + notes_text,
    )
    return response.text
