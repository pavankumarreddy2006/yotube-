from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
ASSETS_DIR = BASE_DIR / "assets"
TEMP_DIR = BASE_DIR / "tmp"


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    newsapi_key: str = os.getenv("NEWSAPI_KEY", "")
    cricapi_key: str = os.getenv("CRICAPI_KEY", "")
    youtube_client_secrets_file: str = os.getenv("YOUTUBE_CLIENT_SECRETS_FILE", "client_secrets.json")
    youtube_refresh_token: str = os.getenv("YOUTUBE_REFRESH_TOKEN", "")
    youtube_client_id: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    youtube_client_secret: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ffmpeg_path: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    background_video_vertical: str = os.getenv("BACKGROUND_VIDEO_VERTICAL", str(ASSETS_DIR / "background_vertical.mp4"))
    background_video_horizontal: str = os.getenv("BACKGROUND_VIDEO_HORIZONTAL", str(ASSETS_DIR / "background_horizontal.mp4"))
    thumbnail_font_path: str = os.getenv("THUMBNAIL_FONT_PATH", "")
    channel_name: str = os.getenv("CHANNEL_NAME", "Telugu Sports Update")
    enable_upload: bool = _get_bool("ENABLE_UPLOAD", True)
    enable_notifications: bool = _get_bool("ENABLE_NOTIFICATIONS", True)
    enable_voice: bool = _get_bool("ENABLE_VOICE", True)
    enable_long_video: bool = _get_bool("ENABLE_LONG_VIDEO", True)
    public_visibility: str = os.getenv("YOUTUBE_PRIVACY_STATUS", "public")


settings = Settings()

for required_dir in (OUTPUT_DIR, ASSETS_DIR, TEMP_DIR):
    required_dir.mkdir(parents=True, exist_ok=True)
