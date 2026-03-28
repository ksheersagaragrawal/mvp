import asyncio
import json
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["live"])

client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY"),
    http_options=types.HttpOptions(api_version="v1alpha"),
)

LIVE_MODEL = "gemini-3.1-flash-live-preview"

EINSTEIN_CONFIG = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    input_audio_transcription=types.AudioTranscriptionConfig(),
    system_instruction=types.Content(
        parts=[
            types.Part(
                text="""You are Einstein, an AI meeting co-pilot silently observing a live meeting.

CORE RULE: Stay completely silent unless someone directly addresses you by saying "Einstein" at the start of their sentence. If you hear general meeting conversation — status updates, debates, side chats, people talking to each other — do not respond. Do not interject. Do not summarise. Say nothing.

WHEN ADDRESSED (someone says "Einstein, ..." or "Hey Einstein ..."):
- Respond immediately, concisely (1-3 sentences max)
- Be helpful, calm, non-judgmental
- Never reveal who asked or repeat names
- Acknowledge you are AI openly — that is a feature, not a flaw

EXAMPLES of when NOT to respond:
- "I think we should ship by Friday" → silence
- "What does the PM think?" → silence
- "Can you pull up the deck?" → silence (not addressed to you)

EXAMPLES of when to respond:
- "Einstein, what does API rate limiting mean?" → answer it
- "Hey Einstein, how long does a typical sprint take?" → answer it
- "Einstein, is this architecture scalable?" → answer it

You are a team player, not the leader. The humans run the meeting. You assist when called."""
            )
        ]
    ),
)


@router.websocket("/ws/live-test")
async def live_test(websocket: WebSocket):
    """Simple Live API test — send text, get text back."""
    await websocket.accept()
    await websocket.send_json({"type": "status", "text": "Backend connected. Reaching Gemini Live..."})
    try:
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=types.LiveConnectConfig(response_modalities=["AUDIO"]),
        ) as session:
            await websocket.send_json({"type": "status", "text": "Connected to Gemini Live!"})

            async def recv_client():
                async for msg in websocket.iter_text():
                    data = json.loads(msg)
                    if data.get("type") == "text":
                        await session.send_realtime_input(text=data["text"])
                    elif data.get("type") == "audio":
                        audio_bytes = base64.b64decode(data["data"])
                        await session.send_realtime_input(
                            audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                        )

            async def recv_gemini():
                while True:
                    async for response in session.receive():
                        if response.text:
                            await websocket.send_json({"type": "text", "text": response.text})
                        if response.data:
                            audio_b64 = base64.b64encode(response.data).decode()
                            await websocket.send_json({"type": "audio", "data": audio_b64, "bytes": len(response.data)})

            await asyncio.gather(recv_client(), recv_gemini())
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "text": str(e)})
        except Exception:
            pass


@router.websocket("/ws/meetings/{meeting_id}/live")
async def live_meeting_stream(websocket: WebSocket, meeting_id: str):
    """
    WebSocket endpoint for real-time Gemini Live integration.

    Client sends:  { "type": "audio", "data": "<base64 PCM audio>" }
                   { "type": "text", "data": "Einstein: <question>" }

    Server sends:  { "type": "transcript", "text": "..." }
                   { "type": "answer", "text": "...", "audio": "<base64>" }
    """
    await websocket.accept()
    await websocket.send_json({"type": "status", "text": "Connecting Einstein..."})

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=EINSTEIN_CONFIG) as session:
            await websocket.send_json({"type": "status", "text": "Einstein is listening."})

            async def receive_from_client():
                async for message in websocket.iter_text():
                    data = json.loads(message)
                    if data["type"] == "audio":
                        audio_bytes = base64.b64decode(data["data"])
                        await session.send_realtime_input(
                            audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                        )
                    elif data["type"] == "video":
                        frame_bytes = base64.b64decode(data["data"])
                        await session.send_realtime_input(
                            video=types.Blob(data=frame_bytes, mime_type="image/jpeg")
                        )
                    elif data["type"] == "text":
                        await session.send_realtime_input(text=data["data"])

            async def receive_from_gemini():
                from services import db
                while True:
                    async for response in session.receive():
                        # Input transcription — what humans said
                        if response.server_content and response.server_content.input_transcription:
                            text = response.server_content.input_transcription.text
                            if text and text.strip():
                                await db.append_transcript(meeting_id, text, "Participant")
                                await websocket.send_json({"type": "transcript", "text": text})
                        # Einstein's audio response
                        if response.data:
                            audio_b64 = base64.b64encode(response.data).decode()
                            await websocket.send_json({"type": "audio", "data": audio_b64})

            await asyncio.gather(receive_from_client(), receive_from_gemini())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
