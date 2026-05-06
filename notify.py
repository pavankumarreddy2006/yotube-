from __future__ import annotations

import requests

from runtime import get_runtime_settings
from settings import settings
from utils import get_logger

logger = get_logger(__name__)

STAGE_LABELS = {
    "started": "🚀 Automation Started",
    "news_fetched": "📰 Topic Selected",
    "script_ready": "✍ Script Generated",
    "voice_generated": "🎤 Voice Generated",
    "video_created": "🎬 Rendering Completed",
    "uploading": "📤 Upload Started",
    "upload_success": "✅ Upload Completed",
    "retry_started": "🔁 Retry Started",
    "all_done": "✅ Automation Completed",
    "error": "❌ Automation Failed",
}


def _telegram_url(method: str) -> str:
    runtime = get_runtime_settings()
    token = runtime.telegram_bot_token or settings.telegram_bot_token
    return f"https://api.telegram.org/bot{token}/{method}"


def _log_telegram_response(response: requests.Response, action: str) -> None:
    preview = (response.text or "")[:500]
    logger.info("Telegram %s response: status=%s body=%s", action, response.status_code, preview)


def validate_telegram_config() -> None:
    runtime = get_runtime_settings()
    if not (runtime.has_telegram or settings.has_telegram):
        raise RuntimeError("Telegram credentials missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")


def send_telegram(message: str) -> None:
    runtime = get_runtime_settings()
    if not runtime.enable_notifications:
        logger.info("Telegram notifications disabled.")
        return

    validate_telegram_config()
    response = requests.post(
        _telegram_url("sendMessage"),
        json={
            "chat_id": str(runtime.telegram_chat_id or settings.telegram_chat_id),
            "text": str(message),
            "disable_web_page_preview": True,
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
            description = f"{description}. Ensure the bot is started by the user and the chat ID is correct."
        raise RuntimeError(description)


def send_stage_notification(stage: str, detail: str = "") -> None:
    prefix = STAGE_LABELS.get(stage, stage.upper())
    message = "CreatorOS AI Studio\n\n" + (prefix if not detail else f"{prefix}\n\n{detail}")
    try:
        send_telegram(message)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram failed: %s", exc)


def send_upload_success(title: str, youtube_link: str, *, variant: str) -> None:
    send_stage_notification("upload_success", f"Variant: {variant}\nTitle: {title}\nLink: {youtube_link}")


def send_upload_failure(step_name: str, error_details: str) -> None:
    send_stage_notification("error", f"Step: {step_name}\nError: {error_details}")
