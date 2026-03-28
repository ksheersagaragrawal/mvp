import time
import asyncio
import httpx
import os
from google import genai
from google.genai import types
from services.gemini_client import client

# Use Veo 2 for stable output; swap to "veo-3.0-generate-preview" for Veo 3.1
VEO_MODEL = "veo-2.0-generate-001"

RECAP_PROMPT_TEMPLATE = """Create a professional 8-second meeting recap video.
Style: clean dark background, animated white text overlays, minimal and modern.
Content:

Meeting: {title}

Summary: {summary}

Key Decisions: {decisions}

Action Items: {action_items}

Tone: concise, professional, engaging."""


async def generate_recap_video(
    meeting_title: str,
    summary: str,
    decisions: list[str],
    action_items: list[str],
) -> bytes:
    """
    Generate a meeting recap video using Veo via Gemini API.
    Returns raw video bytes.
    """
    prompt = RECAP_PROMPT_TEMPLATE.format(
        title=meeting_title,
        summary=summary,
        decisions=", ".join(decisions),
        action_items=", ".join(action_items),
    )

    operation = client.models.generate_videos(
        model=VEO_MODEL,
        prompt=prompt,
        config=types.GenerateVideosConfig(
            aspect_ratio="16:9",
            number_of_videos=1,
            duration_seconds=8,
        ),
    )

    # Poll until complete (non-blocking)
    while not operation.done:
        await asyncio.sleep(5)
        operation = client.operations.get(operation)

    video = operation.response.generated_videos[0]

    if video.video.video_bytes:
        return video.video.video_bytes

    # Veo returns a URI — download it (URI already has ?alt=media, append key)
    uri = video.video.uri
    api_key = os.getenv("GOOGLE_API_KEY")
    download_url = f"{uri}&key={api_key}"
    async with httpx.AsyncClient(follow_redirects=True) as http:
        resp = await http.get(download_url, timeout=120)
        resp.raise_for_status()
        return resp.content
