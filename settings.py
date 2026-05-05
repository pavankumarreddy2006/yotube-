from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", str(BASE_DIR / "output"))).expanduser()
ASSETS_DIR = Path(os.getenv("ASSETS_DIR", str(BASE_DIR / "assets"))).expanduser()
TEMP_DIR = Path(os.getenv("TEMP_DIR", str(BASE_DIR / "tmp"))).expanduser()


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
    cloudinary_cloud_name: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key: str = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret: str = os.getenv("CLOUDINARY_API_SECRET", "")
    cloudinary_folder: str = os.getenv("CLOUDINARY_FOLDER", "youtube-automation")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_tts_model: str = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    openai_tts_voice: str = os.getenv("OPENAI_TTS_VOICE", "alloy")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id: str = os.getenv("ELEVENLABS_VOICE_ID", "")
    elevenlabs_model: str = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    elevenlabs_stability: float = float(os.getenv("ELEVENLABS_STABILITY", "0.45"))
    elevenlabs_similarity_boost: float = float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.8"))
    elevenlabs_style: float = float(os.getenv("ELEVENLABS_STYLE", "0.3"))
    azure_tts_key: str = os.getenv("AZURE_TTS_KEY", "")
    azure_tts_region: str = os.getenv("AZURE_TTS_REGION", "")
    azure_tts_voice: str = os.getenv("AZURE_TTS_VOICE", "te-IN-MohanNeural")
    azure_tts_style: str = os.getenv("AZURE_TTS_STYLE", "newscast")
    azure_tts_style_degree: str = os.getenv("AZURE_TTS_STYLE_DEGREE", "1.1")
    azure_tts_output_format: str = os.getenv(
        "AZURE_TTS_OUTPUT_FORMAT",
        "audio-24khz-160kbitrate-mono-mp3",
    )
    tts_provider: str = os.getenv("TTS_PROVIDER", "elevenlabs")
    tts_rate: str = os.getenv("TTS_RATE", "0%")
    tts_pitch: str = os.getenv("TTS_PITCH", "0%")
    default_language: str = os.getenv("DEFAULT_LANGUAGE", "te")
    ffmpeg_path: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    ffprobe_path: str = os.getenv("FFPROBE_PATH", "ffprobe")
    background_video_vertical: str = os.getenv("BACKGROUND_VIDEO_VERTICAL", str(ASSETS_DIR / "background_vertical.mp4"))
    background_video_horizontal: str = os.getenv("BACKGROUND_VIDEO_HORIZONTAL", str(ASSETS_DIR / "background_horizontal.mp4"))
    background_music_path: str = os.getenv("BACKGROUND_MUSIC_PATH", str(ASSETS_DIR / "background_music.mp3"))
    intro_video_path: str = os.getenv("INTRO_VIDEO_PATH", str(ASSETS_DIR / "intro.mp4"))
    outro_video_path: str = os.getenv("OUTRO_VIDEO_PATH", str(ASSETS_DIR / "outro.mp4"))
    thumbnail_font_path: str = os.getenv("THUMBNAIL_FONT_PATH", str(ASSETS_DIR / "DejaVuSans-Bold.ttf"))
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
    retain_run_artifacts: int = max(1, int(os.getenv("RETAIN_RUN_ARTIFACTS", "1")))
    artifact_ttl_hours: int = max(1, int(os.getenv("ARTIFACT_TTL_HOURS", "24")))

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_youtube_upload(self) -> bool:
        return bool(self.youtube_client_id and self.youtube_client_secret and self.youtube_refresh_token)

    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_chat_id)

    @property
    def has_cloudinary(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)


settings = Settings()

for required_dir in (OUTPUT_DIR, ASSETS_DIR, TEMP_DIR):
    required_dir.mkdir(parents=True, exist_ok=True)
