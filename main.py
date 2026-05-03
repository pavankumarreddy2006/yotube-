from __future__ import annotations

import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from content import ContentPackage, fallback_content as content_fallback_content, generate_content
from data import TopicCandidate, fallback_story_for_date, fetch_all_candidates, select_daily_highlights
from notify import send_upload_failure, send_upload_success, send_telegram
from scoring import ScoredTopic, choose_best_topic
from settings import BASE_DIR, OUTPUT_DIR, settings
from thumbnail import create_thumbnail
from upload import upload_video
from utils import dump_json, get_logger, load_json, setup_logging, slugify
from video import build_video
from voice import synthesize_voice


setup_logging(BASE_DIR / "logs.txt")
logging.basicConfig(
    filename=str(BASE_DIR / "logs.txt"),
    level=logging.INFO,
)
logger = get_logger(__name__)


def fallback_content() -> dict[str, str]:
    return content_fallback_content()


def _fallback_package() -> ContentPackage:
    data = fallback_content()
    return ContentPackage(
        title="Top Sports News Today | Telugu Daily Bulletin",
        description=f"{data['script']}\n\nsports news, cricket, football, highlights\nLike, Share, Subscribe.",
        tags=[
            "sports news",
            "daily sports news",
            "cricket news",
            "football news",
            "sports highlights",
            "telugu sports news",
            "breaking sports news",
            "olympics news",
            "world sports update",
            "sports bulletin",
        ],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script_telugu=data["script"],
        long_script_telugu=data["script"],
        highlights_telugu=[data["script"]],
        hashtags=["#SportsNews", "#TeluguSports"],
    )


def _safe_topic() -> TopicCandidate:
    return fallback_story_for_date()


def _safe_scored_topic(candidate: TopicCandidate) -> ScoredTopic:
    try:
        return choose_best_topic([candidate])
    except Exception:
        return ScoredTopic(candidate=candidate, score=0.0, decision="FALLBACK", reasons=["fallback"])


def _write_status(status: dict[str, object]) -> None:
    try:
        dump_json(status, OUTPUT_DIR / "pipeline_status.json")
    except Exception:
        logger.exception("Failed to write pipeline status")


def _write_latest_run(payload: dict[str, object]) -> None:
    try:
        dump_json(payload, OUTPUT_DIR / "latest_run.json")
    except Exception:
        logger.exception("Failed to write latest run metadata")


def _load_latest_content_package() -> ContentPackage:
    latest_run = load_json(OUTPUT_DIR / "latest_run.json", default={}) or {}
    content_payload = {}
    work_dir = latest_run.get("work_dir")
    if work_dir:
        content_payload = load_json(Path(str(work_dir)) / "content.json", default={}) or {}
    content_data = content_payload.get("content", {})
    if not content_data:
        return _fallback_package()
    return ContentPackage(
        title=content_data.get("title", "Telugu Sports Update"),
        description=content_data.get("description", ""),
        tags=content_data.get("tags", []) or [],
        thumbnail_text=content_data.get("thumbnail_text", "SPORTS UPDATE"),
        hook=content_data.get("hook", ""),
        shorts_script_telugu=content_data.get("shorts_script_telugu", content_data.get("shorts_script", "")),
        long_script_telugu=content_data.get("long_script_telugu", content_data.get("long_script", "")),
        highlights_telugu=content_data.get("highlights_telugu", []) or [],
        hashtags=content_data.get("hashtags", []) or [],
    )


def _build_notifications(upload_result: str | None, work_dir: Path) -> list[dict[str, str]]:
    items = [
        {
            "id": "run-complete",
            "timestamp": datetime.now().isoformat(),
            "message": f"Pipeline completed. Output folder: {work_dir.name}",
        }
    ]
    if upload_result:
        items.append(
            {
                "id": "upload-result",
                "timestamp": datetime.now().isoformat(),
                "message": f"Upload result: {upload_result}",
            }
        )
    return items


def _should_generate_voice() -> bool:
    return settings.enable_voice


def _should_attempt_upload() -> bool:
    return settings.enable_upload and settings.has_youtube_upload


def _build_upload_summary(shorts_upload: str | None, long_upload: str | None) -> str | None:
    parts: list[str] = []
    if shorts_upload:
        parts.append(f"shorts={shorts_upload}")
    if long_upload:
        parts.append(f"long={long_upload}")
    return " | ".join(parts) if parts else None


def _headline_signature(highlights: list[TopicCandidate]) -> str:
    return " | ".join(item.title.strip().lower() for item in highlights[: settings.max_daily_highlights])


def _is_duplicate_run(signature: str) -> bool:
    latest_run = load_json(OUTPUT_DIR / "latest_run.json", default={}) or {}
    last_signature = str(latest_run.get("headline_signature", "")).strip().lower()
    return bool(signature and signature == last_signature)


def _write_subtitles(script: str, output_path: Path) -> str | None:
    cleaned = " ".join(part.strip() for part in script.splitlines() if part.strip()).strip()
    if not cleaned:
        return None

    chunks = [chunk.strip() for chunk in cleaned.replace("!", ".").replace("?", ".").split(".") if chunk.strip()]
    if not chunks:
        chunks = [cleaned]

    lines = []
    cursor = 0
    for index, chunk in enumerate(chunks, start=1):
        start = cursor
        end = start + 4
        cursor = end
        lines.append(str(index))
        lines.append(f"00:00:{start:02d},000 --> 00:00:{end:02d},000")
        lines.append(chunk)
        lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    return str(output_path)


def _probe_duration(path: str | Path) -> float:
    video_path = Path(str(path))
    if not video_path.exists():
        return 0.0

    command = [
        settings.ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return float((result.stdout or "0").strip() or 0)
    except Exception:
        return 0.0


def _quality_check_video(path: str | None, *, min_seconds: int, label: str) -> list[str]:
    issues: list[str] = []
    if not path:
        return [f"{label} missing"]

    file_path = Path(str(path))
    if not file_path.exists():
        issues.append(f"{label} file not found")
        return issues
    if file_path.stat().st_size < 1024:
        issues.append(f"{label} file too small")

    if settings.enable_quality_checks:
        duration = _probe_duration(file_path)
        if duration and duration < min_seconds:
            issues.append(f"{label} duration too short ({duration:.1f}s)")
        elif duration == 0:
            issues.append(f"{label} duration unavailable")
    return issues


def generate_shorts_voice(content: ContentPackage, work_dir: Path) -> str | None:
    if not settings.enable_voice:
        logger.info("Voice generation disabled")
        return None
    script = " ".join(part for part in [content.hook, content.shorts_script] if part).strip()
    if not script:
        script = fallback_content()["script"]
    return synthesize_voice(script, str(work_dir / "shorts.mp3"))


def generate_long_voice(content: ContentPackage, work_dir: Path) -> str | None:
    if not settings.enable_voice:
        logger.info("Long voice generation disabled")
        return None
    script = (content.long_script or "").strip()
    if not script:
        logger.info("Long-form script missing, skipping long voice generation")
        return None
    return synthesize_voice(script, str(work_dir / "long.mp3"), lang="te")


def create_shorts_video(audio_path: str | None, work_dir: Path, subtitles_path: str | None) -> str | None:
    return build_video(
        audio_path=audio_path,
        output_path=str(work_dir / "shorts.mp4"),
        background_path=str(settings.background_video_vertical),
        vertical=True,
        subtitles_path=subtitles_path,
        music_path=settings.background_music_path,
    )


def create_long_video(audio_path: str | None, work_dir: Path, subtitles_path: str | None) -> str | None:
    return build_video(
        audio_path=audio_path,
        output_path=str(work_dir / "long.mp4"),
        background_path=str(settings.background_video_horizontal),
        vertical=False,
        subtitles_path=subtitles_path,
        music_path=settings.background_music_path,
    )


def upload_video_safe(
    video_path: str | None,
    content: ContentPackage,
    thumbnail_path: str | None,
    *,
    long_form: bool,
) -> str | None:
    if not video_path or not thumbnail_path:
        logger.info("Upload skipped because video or thumbnail is unavailable")
        return "upload-skipped-missing-artifacts"

    title = content.title.strip()
    description = content.description.strip()
    if long_form:
        title = f"{title[:88]} | Full Bulletin"
    else:
        title = f"{title[:88]} #Shorts"
        if "#shorts" not in description.lower():
            description = f"{description}\n\n#Shorts #TeluguSports".strip()

    try:
        return upload_video(
            video_path=str(video_path),
            title=title,
            description=description,
            tags=content.tags,
            thumbnail_path=str(thumbnail_path),
        )
    except Exception as exc:
        logger.error("Upload failed: %s", exc)
        return f"upload-failed: {str(exc)[:180]}"


def _attempt_uploads(
    *,
    shorts_video_path: str | None,
    long_video_path: str | None,
    content: ContentPackage,
    thumbnail_path: str | None,
) -> tuple[str | None, str | None]:
    if not _should_attempt_upload():
        skipped = "upload-skipped-missing-credentials"
        return skipped, skipped if settings.enable_long_video else None

    shorts_upload_result = upload_video_safe(shorts_video_path, content, thumbnail_path, long_form=False)
    long_upload_result: str | None = None
    if settings.enable_long_video:
        long_upload_result = upload_video_safe(long_video_path, content, thumbnail_path, long_form=True)
    return shorts_upload_result, long_upload_result


def _run_once(mode: str = "full") -> None:
    candidates: list[TopicCandidate] = []
    trends: list[str] = []
    highlights: list[TopicCandidate] = []
    selected_topic = _safe_topic()
    scored = _safe_scored_topic(selected_topic)
    content = _fallback_package()
    shorts_audio_path: str | None = None
    long_audio_path: str | None = None
    shorts_video_path: str | None = None
    long_video_path: str | None = None
    thumbnail_path: str | None = None
    shorts_upload_result: str | None = None
    long_upload_result: str | None = None
    work_dir = OUTPUT_DIR

    if mode == "upload_only":
        latest_run = load_json(OUTPUT_DIR / "latest_run.json", default={}) or {}
        content = _load_latest_content_package()
        shorts_video_path = latest_run.get("shorts_video") or latest_run.get("video") or None
        long_video_path = latest_run.get("long_video") or None
        thumbnail_path = latest_run.get("thumbnail") or None
        work_dir_value = latest_run.get("work_dir")
        if work_dir_value:
            work_dir = Path(str(work_dir_value))

        shorts_upload_result, long_upload_result = _attempt_uploads(
            shorts_video_path=shorts_video_path,
            long_video_path=long_video_path,
            content=content,
            thumbnail_path=thumbnail_path,
        )
        upload_result = _build_upload_summary(shorts_upload_result, long_upload_result)
        _write_latest_run(
            {
                "work_dir": str(work_dir),
                "title": content.title,
                "video": shorts_video_path,
                "shorts_video": shorts_video_path,
                "long_video": long_video_path,
                "audio": latest_run.get("audio"),
                "shorts_audio": latest_run.get("shorts_audio"),
                "long_audio": latest_run.get("long_audio"),
                "thumbnail": thumbnail_path,
                "upload": upload_result,
                "shorts_upload": shorts_upload_result,
                "long_upload": long_upload_result,
                "completed_at": datetime.now().isoformat(),
            }
        )
        _write_status(
            {
                "running": False,
                "failed": False,
                "status": "Completed",
                "current_task": "Upload-only pipeline completed",
                "last_run_time": datetime.now().isoformat(),
                "mode": mode,
                "work_dir": str(work_dir),
                "video": shorts_video_path,
                "shorts_video": shorts_video_path,
                "long_video": long_video_path,
                "thumbnail_url": thumbnail_path,
                "thumbnail_text": content.thumbnail_text,
                "notifications": _build_notifications(upload_result, work_dir),
            }
        )
        return

    try:
        candidates, trends = fetch_all_candidates()
    except Exception as exc:
        logging.error("Data fetch failed: %s", exc)
        candidates = []
        trends = []

    highlights = select_daily_highlights(candidates) if candidates else [_safe_topic()]
    signature = _headline_signature(highlights)
    if _is_duplicate_run(signature):
        raise RuntimeError("Duplicate content signature detected for today")

    try:
        scored = choose_best_topic(highlights)
        selected_topic = scored.candidate
    except Exception as exc:
        logging.error("Scoring failed: %s", exc)
        selected_topic = highlights[0]
        scored = _safe_scored_topic(selected_topic)

    try:
        content = generate_content(selected_topic, scored, trends, highlights)
    except Exception as exc:
        logging.error("Content generation failed: %s", exc)
        content = _fallback_package()

    work_dir = OUTPUT_DIR / f"{datetime.now():%Y%m%d_%H%M%S}_{slugify(content.title or selected_topic.title)}"
    work_dir.mkdir(parents=True, exist_ok=True)

    shorts_subtitles_path = _write_subtitles(content.shorts_script_telugu, work_dir / "shorts.srt")
    long_subtitles_path = _write_subtitles(content.long_script_telugu, work_dir / "long.srt")

    dump_json(
        {
            "mode": mode,
            "selected_topic": selected_topic,
            "scored_topic": scored,
            "highlights": highlights,
            "content": content,
            "trends": trends,
            "headline_signature": signature,
        },
        work_dir / "content.json",
    )

    thumbnail_path = str(
        create_thumbnail(
            content.thumbnail_text or "Telugu Sports Update",
            content.thumbnail_idea,
            work_dir / "thumbnail.jpg",
        )
    )

    if _should_generate_voice():
        shorts_audio_path = generate_shorts_voice(content, work_dir)
        if settings.enable_long_video:
            long_audio_path = generate_long_voice(content, work_dir)

    shorts_video_path = create_shorts_video(shorts_audio_path, work_dir, shorts_subtitles_path)
    if settings.enable_long_video:
        long_video_path = create_long_video(long_audio_path, work_dir, long_subtitles_path)

    issues = _quality_check_video(shorts_video_path, min_seconds=20, label="shorts video")
    if settings.enable_long_video:
        issues.extend(_quality_check_video(long_video_path, min_seconds=180, label="long video"))
    if issues:
        raise RuntimeError("; ".join(issues))

    shorts_upload_result, long_upload_result = _attempt_uploads(
        shorts_video_path=shorts_video_path,
        long_video_path=long_video_path,
        content=content,
        thumbnail_path=thumbnail_path,
    )
    upload_result = _build_upload_summary(shorts_upload_result, long_upload_result)

    _write_latest_run(
        {
            "work_dir": str(work_dir),
            "title": content.title,
            "video": shorts_video_path,
            "shorts_video": shorts_video_path,
            "long_video": long_video_path,
            "audio": shorts_audio_path,
            "shorts_audio": shorts_audio_path,
            "long_audio": long_audio_path,
            "thumbnail": thumbnail_path,
            "upload": upload_result,
            "shorts_upload": shorts_upload_result,
            "long_upload": long_upload_result,
            "headline_signature": signature,
            "completed_at": datetime.now().isoformat(),
        }
    )

    has_upload_issue = bool(upload_result and "upload-failed:" in upload_result)
    _write_status(
        {
            "running": False,
            "failed": has_upload_issue,
            "status": "Completed with upload issue" if has_upload_issue else "Completed",
            "current_task": upload_result if has_upload_issue else "Pipeline completed",
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
            "work_dir": str(work_dir),
            "video": shorts_video_path,
            "shorts_video": shorts_video_path,
            "long_video": long_video_path,
            "thumbnail_url": thumbnail_path,
            "thumbnail_text": content.thumbnail_text,
            "notifications": _build_notifications(upload_result, work_dir),
        }
    )

    if shorts_upload_result and shorts_upload_result.startswith("https://"):
        send_upload_success(f"{content.title} #Shorts", shorts_upload_result)
    if long_upload_result and long_upload_result.startswith("https://"):
        send_upload_success(f"{content.title} | Full Bulletin", long_upload_result)


def run_pipeline(mode: str = "full") -> None:
    logging.info("Pipeline started")

    _write_status(
        {
            "running": True,
            "failed": False,
            "status": "Running",
            "current_task": "Starting pipeline",
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
        }
    )

    attempts = 1 if mode == "upload_only" else settings.pipeline_retry_limit + 1
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            _write_status(
                {
                    "running": True,
                    "failed": False,
                    "status": "Running",
                    "current_task": f"Pipeline attempt {attempt} of {attempts}",
                    "last_run_time": datetime.now().isoformat(),
                    "mode": mode,
                }
            )
            _run_once(mode)
            logging.info("Pipeline completed")
            return
        except Exception as exc:
            last_error = exc
            logging.error("Pipeline attempt %s failed: %s", attempt, exc)
            if attempt >= attempts:
                break

    message = f"Pipeline failed after retries: {str(last_error)[:220]}" if last_error else "Pipeline failed"
    _write_status(
        {
            "running": False,
            "failed": True,
            "status": "Failed",
            "current_task": message,
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
            "notifications": [
                {
                    "id": "run-failed",
                    "timestamp": datetime.now().isoformat(),
                    "message": message,
                }
            ],
        }
    )
    send_upload_failure(message)


def run_pipeline_logic(mode: str = "full") -> None:
    run_pipeline(mode)


def main() -> None:
    selected_mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    run_pipeline_logic(selected_mode)


if __name__ == "__main__":
    main()
