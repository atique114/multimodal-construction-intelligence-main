"""Gemini adapter with a graceful demonstration fallback at API call sites."""
import json
import re
from typing import Any, Optional

from .config import get_settings


def gemini_text(prompt: str, image_bytes: Optional[bytes] = None, mime_type: Optional[str] = None) -> str:
    settings = get_settings()
    if not settings["gemini_api_key"]:
        raise RuntimeError("Gemini API key is not configured")
    from google import genai
    from google.genai import types

    contents: list[Any] = [prompt]
    if image_bytes is not None:
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type or "image/jpeg"))
    result = genai.Client(api_key=settings["gemini_api_key"]).models.generate_content(
        model=settings["gemini_model"], contents=contents
    )
    if not result.text:
        raise ValueError("Gemini returned an empty response")
    return result.text


def parse_json_object(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("The model response did not contain a JSON object")
    value = json.loads(cleaned[start:end + 1])
    if not isinstance(value, dict):
        raise ValueError("The model response must be a JSON object")
    return value
