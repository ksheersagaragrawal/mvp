import base64
import struct
from google.genai import types
from services.gemini_client import client, TTS_MODEL


def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    """Wrap raw PCM bytes in a WAV container so browsers can play it."""
    byte_rate = sample_rate * channels * bits // 8
    block_align = channels * bits // 8
    data_size = len(pcm_data)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16, 1, channels,
        sample_rate, byte_rate, block_align, bits,
        b"data", data_size,
    )
    return header + pcm_data


async def text_to_speech_base64(text: str) -> tuple[str, str]:
    """
    Returns (base64_wav_audio, 'audio/wav').
    Gemini TTS returns raw PCM — we wrap it in WAV so the browser can play it.
    """
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Charon"
                    )
                )
            ),
        ),
    )
    inline = response.candidates[0].content.parts[0].inline_data
    pcm_bytes = base64.b64decode(inline.data)
    wav_bytes = _pcm_to_wav(pcm_bytes)
    return base64.b64encode(wav_bytes).decode("utf-8"), "audio/wav"
