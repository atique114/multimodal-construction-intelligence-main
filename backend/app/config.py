"""Runtime settings loaded from environment variables."""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_settings():
    return {
        "gemini_api_key": os.getenv("GEMINI_API_KEY", "").strip(),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip(),
        "frontend_origins": [
            origin.strip() for origin in os.getenv(
                "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",") if origin.strip()
        ],
        "max_image_bytes": int(os.getenv("MAX_IMAGE_MB", "12")) * 1024 * 1024,
    }
