from __future__ import annotations

from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

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
    credentials.refresh(Request())
    youtube = build("youtube", "v3", credentials=credentials)

    def operation() -> str:
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
            _, response = request.next_chunk()
        video_id = response["id"]
        youtube.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(thumbnail_path))).execute()
        return f"https://www.youtube.com/watch?v={video_id}"

    return retry(operation, operation_name=f"upload -> {video_path}")
