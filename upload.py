from __future__ import annotations

from pathlib import Path
import json

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


class PermanentUploadError(RuntimeError):
    """Raised when the YouTube API reports a non-retryable upload failure."""


def _extract_google_error(exc: Exception) -> tuple[str, int | None, list[str]]:
    if isinstance(exc, HttpError):
        status = getattr(exc.resp, "status", "unknown")
        reasons: list[str] = []
        try:
            payload = exc.error_details if getattr(exc, "error_details", None) else []
        except Exception:
            payload = []
        if not payload:
            try:
                content = json.loads(exc.content.decode("utf-8"))
                payload = content.get("error", {}).get("errors", [])
            except Exception:
                payload = []
        if payload:
            reasons = [str(item.get("reason") or item.get("message") or item) for item in payload]
            detail = "; ".join(reasons)
            return f"YouTube API error {status}: {detail}", int(status), reasons
        return f"YouTube API error {status}: {exc}", int(status), reasons
    return str(exc), None, []


def _format_upload_guidance(status: int | None, reasons: list[str]) -> str:
    normalized = {reason.lower() for reason in reasons}
    if status == 403:
        if "forbidden" in normalized:
            return (
                " Upload permission was denied by YouTube. Check that the signed-in Google account owns or has "
                "upload access to a YouTube channel, the YouTube Data API v3 is enabled for this OAuth project, "
                "and if the OAuth consent screen is in testing mode, that this Google account is added as a test user."
            )
        if "youtubeSignupRequired".lower() in normalized:
            return " The signed-in Google account does not have a YouTube channel yet. Create a channel and retry."
        if "quotaExceeded".lower() in normalized:
            return " The YouTube Data API quota for this Google Cloud project is exhausted. Retry after quota resets."
    if status == 401:
        return " The refresh token or OAuth client is invalid for upload. Generate a new refresh token and retry."
    return ""


def _should_retry_upload(exc: Exception, _attempt: int) -> bool:
    if isinstance(exc, PermanentUploadError):
        return False
    if isinstance(exc, HttpError):
        status = int(getattr(exc.resp, "status", 0) or 0)
        return status >= 500 or status == 429
    return True

# Upload a finished video to YouTube using the refresh token stored in .env.
# The function refreshes the OAuth access token automatically and submits the
# video file, title, description, tags, and thumbnail to the YouTube Data API.


def upload_video(
    *,
    video_path: str | Path,
    title: str,
    description: str,
    tags: list[str],
    thumbnail_path: str | Path,
    progress_callback=None,
) -> str:
    if not settings.enable_upload:
        logger.info("Upload disabled. Skipping YouTube upload.")
        return "upload-disabled"
    if not settings.has_youtube_upload:
        logger.warning("YouTube credentials missing. Skipping upload.")
        return "upload-skipped-missing-credentials"
    if not Path(str(video_path)).exists():
        logger.warning("Video file missing. Skipping upload for %s", video_path)
        return "upload-skipped-missing-video"
    if not Path(str(thumbnail_path)).exists():
        logger.warning("Thumbnail file missing. Skipping upload for %s", thumbnail_path)
        return "upload-skipped-missing-thumbnail"

    # Build OAuth credentials from the saved refresh token and refresh them.
    # This allows uploading without needing the user to log in again every run.
    credentials = Credentials(
        None,
        refresh_token=settings.youtube_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.youtube_client_id,
        client_secret=settings.youtube_client_secret,
        scopes=YOUTUBE_SCOPES,
    )
    try:
        credentials.refresh(Request())
        youtube = build("youtube", "v3", credentials=credentials)
    except Exception as exc:
        message, status, reasons = _extract_google_error(exc)
        message = f"{message}{_format_upload_guidance(status, reasons)}"
        logger.error("YouTube authentication failed: %s", message)
        raise RuntimeError(message) from exc

    def operation() -> str:
        try:
            if progress_callback:
                progress_callback(2, "Upload session created.")
            request = youtube.videos().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": title[:100],
                        "description": description,
                        "tags": tags[:500],
                        "categoryId": "17",
                    },
                    "status": {
                        "privacyStatus": settings.public_visibility,
                        "selfDeclaredMadeForKids": False,
                    },
                },
                media_body=MediaFileUpload(str(video_path), resumable=True),
            )
            response = None
            while response is None:
                status, response = request.next_chunk()
                if progress_callback:
                    if status is not None and hasattr(status, "progress"):
                        progress_value = max(2, min(98, int(float(status.progress()) * 100)))
                        progress_callback(progress_value, f"Uploading {progress_value}%")
                    elif response is None:
                        progress_callback(8, "Uploading to YouTube...")
            video_id = response["id"]
            if progress_callback:
                progress_callback(99, "Finalizing thumbnail and publish metadata.")
            youtube.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(thumbnail_path))).execute()
            if progress_callback:
                progress_callback(100, "Upload completed.")
            return f"https://www.youtube.com/watch?v={video_id}"
        except Exception as exc:
            message, status, reasons = _extract_google_error(exc)
            message = f"{message}{_format_upload_guidance(status, reasons)}"
            logger.error("YouTube upload request failed: %s", message)
            if status is not None and status < 500 and status != 429:
                raise PermanentUploadError(message) from exc
            raise RuntimeError(message) from exc

    return retry(
        operation,
        operation_name=f"upload -> {video_path}",
        should_retry=_should_retry_upload,
    )
