from google.genai import types
from services.gemini_client import client, FLASH_MODEL, EINSTEIN_SYSTEM_PROMPT


QNA_PROMPT = """You are Einstein, an AI co-pilot in a live meeting. A participant has anonymously asked a question — they may have missed earlier discussion, lost context, or are too shy to ask openly.

Here is the meeting transcript so far (use this as your primary knowledge base before answering):
---
{context}
---

Using the transcript above as context, answer the anonymous question below.
- If the answer was already discussed in the meeting, summarise what was said.
- If it wasn't discussed, answer from your general knowledge.
- Keep it to 2-4 sentences. Never make the asker feel judged. Never reveal who asked.

Anonymous question: {question}

Answer:"""


async def answer_question(question: str, meeting_context: str = "") -> str:
    """Answer an anonymous meeting question using Gemini Flash."""
    prompt = QNA_PROMPT.format(
        context=meeting_context or "Meeting just started.",
        question=question,
    )

    response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=EINSTEIN_SYSTEM_PROMPT,
            max_output_tokens=400,
        ),
    )
    return response.text.strip()
