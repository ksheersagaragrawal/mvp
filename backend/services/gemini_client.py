import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

FLASH_MODEL = "gemini-2.5-flash"          # Q&A answers
NANO_MODEL = "nano-banana-pro-preview"   # Notes, transcription (Nano Banana prize track)
LIVE_MODEL = "gemini-3.1-flash-live-preview"  # Real-time audio
TTS_MODEL = "gemini-2.5-flash-preview-tts"    # Einstein voice


EINSTEIN_SYSTEM_PROMPT = """You are Einstein, an AI meeting co-pilot. You are a team player, not a leader.
Your personality: calm, precise, witty but not distracting, always helpful.
You acknowledge that you are AI and that is completely fine.
When answering questions anonymously, never reveal who asked.
Keep answers concise and meeting-appropriate — no long lectures.
You assist the team, you do not replace their thinking."""
