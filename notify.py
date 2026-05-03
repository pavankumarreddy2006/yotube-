from __future__ import annotations

import requests

from settings import settings
from utils import get_logger


logger = get_logger(__name__)

STAGE_LABELS = {
    "started": "🚀 STARTED",
    "news_fetched": "📰 NEWS FETCHED",
    "script_ready": "📝 SCRIPT READY",
    "voice_generated": "🎤 VOICE GENERATED",
    "video_created": "🎬 VIDEO CREATED",
    "uploading": "⬆️ UPLOADING",
    "upload_success": "✅ UPLOAD SUCCESS",
    "all_done": "🎉 ALL DONE",
    "error": "❌ ERROR OCCURRED",
}


def send_message(url: str, message: str) -> None:
    response = requests.post(
        url,
        json={
            "chat_id": str(settings.telegram_chat_id),
            "text": str(message),
        },
        timeout=20,
    )
    response.raise_for_status()


def send_telegram(message: str) -> None:
    if not settings.enable_notifications:
        return
    if not settings.has_telegram:
        logger.warning("Telegram credentials missing. Notification skipped.")
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        send_message(url, message)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram failed, skipping: %s", exc)


def send_stage_notification(stage: str, detail: str = "") -> None:
    prefix = STAGE_LABELS.get(stage, stage.upper())
    message = prefix if not detail else f"{prefix}\n{detail}"
    send_telegram(message)


def send_upload_success(title: str, youtube_link: str, *, variant: str) -> None:
    send_stage_notification("upload_success", f"{variant}\nTitle: {title}\nLink: {youtube_link}")


def send_upload_failure(step_name: str, error_details: str) -> None:
    send_stage_notification("error", f"Step: {step_name}\nError: {error_details}")
