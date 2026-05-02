from __future__ import annotations

import requests

from settings import settings
from utils import get_logger


logger = get_logger(__name__)

# Send a Telegram message after upload or when the pipeline fails.
# This keeps notifications simple and does not block the main pipeline.


def send_telegram(message: str) -> None:
    if not settings.enable_notifications:
        return
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.warning("Telegram credentials missing. Notification skipped.")
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        response = requests.post(
            url,
            json={
                "chat_id": settings.telegram_chat_id,
                "text": message,
                "parse_mode": "HTML",
            },
            timeout=20,
        )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram notification failed: %s", exc)
