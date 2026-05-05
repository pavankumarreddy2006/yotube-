from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from settings import BASE_DIR, settings
from utils import dump_json, load_json


RUNTIME_SETTINGS_FILE = BASE_DIR / "output" / "runtime_settings.json"


@dataclass
class RuntimeSettings:
    default_language: str = settings.default_language or "te"
    default_mode: str = "full"
    enable_shorts: bool = True
    enable_long_video: bool = settings.enable_long_video
    enable_upload: bool = settings.enable_upload
    enable_notifications: bool = settings.enable_notifications
    tts_provider: str = settings.tts_provider or "gtts"
    preferred_news_sources: list[str] = field(default_factory=lambda: ["cricapi", "newsapi", "fallback"])
    preferred_visual_sources: list[str] = field(default_factory=lambda: ["article-images", "fallback"])
    short_video_duration: int = 45
    long_video_duration: int = 180
    telegram_bot_token: str = settings.telegram_bot_token
    telegram_chat_id: str = settings.telegram_chat_id
    prompt_seed: str = ""
    prompt_style: str = "breaking"
    auto_mode_label: str = "Full Auto"

    def normalized(self) -> "RuntimeSettings":
        language = str(self.default_language or "te").strip().lower()
        if language not in {"te", "en"}:
            language = "te"
        mode = str(self.default_mode or "full").strip().lower()
        if mode not in {"full", "short", "long", "upload_only"}:
            mode = "full"
        tts_provider = str(self.tts_provider or "gtts").strip().lower()
        preferred_news_sources = _unique_list(self.preferred_news_sources, default=["cricapi", "newsapi", "fallback"])
        preferred_visual_sources = _unique_list(self.preferred_visual_sources, default=["article-images", "fallback"])
        return RuntimeSettings(
            default_language=language,
            default_mode=mode,
            enable_shorts=bool(self.enable_shorts),
            enable_long_video=bool(self.enable_long_video),
            enable_upload=bool(self.enable_upload),
            enable_notifications=bool(self.enable_notifications),
            tts_provider=tts_provider,
            preferred_news_sources=preferred_news_sources,
            preferred_visual_sources=preferred_visual_sources,
            short_video_duration=max(20, int(self.short_video_duration or 45)),
            long_video_duration=max(60, int(self.long_video_duration or 180)),
            telegram_bot_token=str(self.telegram_bot_token or "").strip(),
            telegram_chat_id=str(self.telegram_chat_id or "").strip(),
            prompt_seed=str(self.prompt_seed or "").strip(),
            prompt_style=str(self.prompt_style or "breaking").strip().lower(),
            auto_mode_label=str(self.auto_mode_label or "Full Auto").strip(),
        )

    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_chat_id)

    def to_public_dict(self) -> dict[str, Any]:
        payload = asdict(self.normalized())
        payload["telegram_connected"] = self.has_telegram
        payload["language_options"] = [
            {"value": "te", "label": "Telugu"},
            {"value": "en", "label": "English"},
        ]
        payload["mode_options"] = [
            {"value": "full", "label": "Full Auto"},
            {"value": "short", "label": "Short Video"},
            {"value": "long", "label": "Long Video"},
            {"value": "upload_only", "label": "Upload Only"},
        ]
        payload["tts_options"] = [
            {"value": "edge", "label": "Edge TTS"},
            {"value": "coqui", "label": "Coqui TTS"},
            {"value": "elevenlabs", "label": "ElevenLabs"},
            {"value": "azure", "label": "Azure TTS"},
            {"value": "openai", "label": "OpenAI TTS"},
            {"value": "gtts", "label": "gTTS Fallback"},
        ]
        payload["news_source_options"] = [
            {"value": "cricapi", "label": "CricAPI"},
            {"value": "newsapi", "label": "NewsAPI"},
            {"value": "fallback", "label": "Fallback Stories"},
        ]
        return payload


def _unique_list(items: list[str] | None, *, default: list[str]) -> list[str]:
    values = items or default
    seen: set[str] = set()
    normalized: list[str] = []
    for item in values:
        value = str(item or "").strip().lower()
        if value and value not in seen:
            seen.add(value)
            normalized.append(value)
    return normalized or default


def load_runtime_settings() -> RuntimeSettings:
    payload = load_json(RUNTIME_SETTINGS_FILE, default={}) or {}
    if not isinstance(payload, dict):
        payload = {}
    merged = {
        **asdict(RuntimeSettings()),
        **payload,
    }
    return RuntimeSettings(**merged).normalized()


def save_runtime_settings(update: dict[str, Any]) -> RuntimeSettings:
    current = asdict(load_runtime_settings())
    current.update(update or {})
    runtime = RuntimeSettings(**current).normalized()
    Path(RUNTIME_SETTINGS_FILE).parent.mkdir(parents=True, exist_ok=True)
    dump_json(asdict(runtime), RUNTIME_SETTINGS_FILE)
    return runtime


def get_runtime_settings() -> RuntimeSettings:
    return load_runtime_settings()
