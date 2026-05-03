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
    youtube_client_secrets_file: str = os.getenv("YOUTUBE_CLIENT_SECRETS_FILE", "client_secret.json")
    youtube_refresh_token: str = os.getenv("YOUTUBE_REFRESH_TOKEN", "")
    youtube_client_id: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    youtube_client_secret: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ffmpeg_path: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    ffprobe_path: str = os.getenv("FFPROBE_PATH", "ffprobe")
    background_video_vertical: str = os.getenv("BACKGROUND_VIDEO_VERTICAL", str(ASSETS_DIR / "background_vertical.mp4"))
    background_video_horizontal: str = os.getenv("BACKGROUND_VIDEO_HORIZONTAL", str(ASSETS_DIR / "background_horizontal.mp4"))
    background_music_path: str = os.getenv("BACKGROUND_MUSIC_PATH", str(ASSETS_DIR / "background_music.mp3"))
    intro_video_path: str = os.getenv("INTRO_VIDEO_PATH", str(ASSETS_DIR / "intro.mp4"))
    outro_video_path: str = os.getenv("OUTRO_VIDEO_PATH", str(ASSETS_DIR / "outro.mp4"))
    thumbnail_font_path: str = os.getenv(
        "THUMBNAIL_FONT_PATH",
        str(ASSETS_DIR / "DejaVuSans-Bold.ttf"),
    )
    channel_name: str = os.getenv("CHANNEL_NAME", "Telugu Sports Update")
    max_daily_highlights: int = int(os.getenv("MAX_DAILY_HIGHLIGHTS", "7"))
    min_daily_highlights: int = int(os.getenv("MIN_DAILY_HIGHLIGHTS", "5"))
    pipeline_retry_limit: int = int(os.getenv("PIPELINE_RETRY_LIMIT", "2"))
    daily_run_time: str = os.getenv("DAILY_RUN_TIME", "05:00")
    enable_upload: bool = _get_bool("ENABLE_UPLOAD", True)
    enable_notifications: bool = _get_bool("ENABLE_NOTIFICATIONS", True)
    enable_voice: bool = _get_bool("ENABLE_VOICE", True)
    enable_long_video: bool = _get_bool("ENABLE_LONG_VIDEO", True)
    enable_daily_runner: bool = _get_bool("ENABLE_DAILY_RUNNER", True)
    enable_subtitles: bool = _get_bool("ENABLE_SUBTITLES", True)
    enable_background_music: bool = _get_bool("ENABLE_BACKGROUND_MUSIC", True)
    enable_quality_checks: bool = _get_bool("ENABLE_QUALITY_CHECKS", True)
    public_visibility: str = os.getenv("YOUTUBE_PRIVACY_STATUS", "public")

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_youtube_upload(self) -> bool:
        return bool(self.youtube_client_id and self.youtube_client_secret and self.youtube_refresh_token)

    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_chat_id)


settings = Settings()

for required_dir in (OUTPUT_DIR, ASSETS_DIR, TEMP_DIR):
    required_dir.mkdir(parents=True, exist_ok=True)
