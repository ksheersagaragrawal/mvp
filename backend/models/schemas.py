from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class MeetingStatus(str, Enum):
    active = "active"
    processing = "processing"
    done = "done"


class MeetingCreate(BaseModel):
    title: str
    organizer_name: str
    stakeholder_emails: list[str] = []


class MeetingResponse(BaseModel):
    id: str
    title: str
    status: MeetingStatus
    started_at: datetime
    join_url: str


class QuestionRequest(BaseModel):
    question: str  # no user_id — anonymous by design


class QuestionResponse(BaseModel):
    question_id: str
    answer: str
    audio_url: Optional[str] = None  # TTS audio


class ActionItem(BaseModel):
    task: str
    owner_label: str  # "Speaker 1" not real name
    due_date: Optional[str] = None


class MeetingNotes(BaseModel):
    summary: str
    key_decisions: list[str]
    action_items: list[ActionItem]
    next_steps: str


class WhiteboardRequest(BaseModel):
    image_base64: str


class WhiteboardResponse(BaseModel):
    diagram_markdown: str
    description: str


class RecapVideoResponse(BaseModel):
    video_url: str
    duration_seconds: int


class ProxyCreate(BaseModel):
    user_name: str
    briefing: str  # what Einstein should report in the standup
    meeting_id: str
