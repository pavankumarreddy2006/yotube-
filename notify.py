from __future__ import annotations

import requests

from settings import settings
from utils import get_logger

logger = get_logger(__name__)

STAGE_LABELS = {
    "started": "STARTED",
    "news_fetched": "NEWS FETCHED",
    "script_ready": "SCRIPT READY",
    "voice_generated": "VOICE GENERATED",
    "video_created": "VIDEO CREATED",
    "uploading": "UPLOADING",
    "upload_success": "UPLOAD SUCCESS",
    "all_done": "ALL DONE",
    "error": "ERROR OCCURRED",
}


def _telegram_url(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"


def _log_telegram_response(response: requests.Response, action: str) -> None:
    preview = (response.text or "")[:500]
    logger.info("Telegram %s response: status=%s body=%s", action, response.status_code, preview)


def validate_telegram_config() -> None:
    if not settings.has_telegram:
        raise RuntimeError("Telegram credentials missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")

    logger.info("Validating Telegram bot configuration.")
    me_response = requests.get(_telegram_url("getMe"), timeout=20)
    _log_telegram_response(me_response, "getMe")
    me_response.raise_for_status()
    me_payload = me_response.json()
    if not me_payload.get("ok"):
        raise RuntimeError(f"Telegram getMe failed: {me_payload}")


def send_telegram(message: str) -> None:
    if not settings.enable_notifications:
        logger.info("Telegram notifications disabled.")
        return

    validate_telegram_config()
    logger.info("Sending Telegram")
    response = requests.post(
        _telegram_url("sendMessage"),
        json={
            "chat_id": str(settings.telegram_chat_id),
            "text": str(message),
        },
        timeout=20,
    )
    _log_telegram_response(response, "sendMessage")
    try:
        payload = response.json()
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Telegram sendMessage returned invalid JSON: {response.text[:500]}") from exc

    if response.status_code >= 400 or not payload.get("ok"):
        description = payload.get("description", "Unknown Telegram API error")
        if "chat not found" in description.lower():
            description = f"{description}. Ensure the bot is started by the user and the CHAT ID is correct."
        raise RuntimeError(description)


def send_stage_notification(stage: str, detail: str = "") -> None:
    prefix = STAGE_LABELS.get(stage, stage.upper())
    message = prefix if not detail else f"{prefix}\n{detail}"
    try:
        send_telegram(message)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram failed: %s", exc)


def send_upload_success(title: str, youtube_link: str, *, variant: str) -> None:
    send_stage_notification("upload_success", f"{variant}\nTitle: {title}\nLink: {youtube_link}")


def send_upload_failure(step_name: str, error_details: str) -> None:
    send_stage_notification("error", f"Step: {step_name}\nError: {error_details}")
