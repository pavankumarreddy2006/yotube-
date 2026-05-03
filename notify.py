from __future__ import annotations

import requests

from settings import settings
from utils import get_logger


logger = get_logger(__name__)


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


def send_upload_success(title: str, youtube_link: str) -> None:
    send_telegram(f"✅ Video uploaded successfully\nTitle: {title}\nLink: {youtube_link}")


def send_upload_failure(error_details: str) -> None:
    send_telegram(f"❌ Upload failed\nError details: {error_details}")
