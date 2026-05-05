from __future__ import annotations

import logging
import os
import random
import shutil
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from content import ContentPackage, fallback_content, generate_content, normalize_language
from data import TopicCandidate, fallback_story_for_date, fetch_all_candidates, select_daily_highlights
from notify import send_stage_notification, send_upload_failure, send_upload_success
from scoring import ScoredTopic, choose_best_topic
from settings import BASE_DIR, OUTPUT_DIR, TEMP_DIR, settings
from thumbnail import create_thumbnail
from upload import upload_video
from utils import dump_json, get_logger, load_json, setup_logging, slugify
from video import build_video
from voice import synthesize_voice


setup_logging(BASE_DIR / "logs.txt")
logger = get_logger(__name__)

PIPELINE_LOCK = threading.Lock()
STATUS_FILE = OUTPUT_DIR / "pipeline_status.json"
LATEST_RUN_FILE = OUTPUT_DIR / "latest_run.json"
VARIATION_PREFIXES_TE = [
    "బ్రేకింగ్ న్యూస్",
    "లేటెస్ట్ అప్డేట్",
    "జస్ట్ ఇన్",
]
VARIATION_PREFIXES_EN = [
    "Breaking News",
    "Latest Update",
    "Just In",
]


def _fallback_package(language: str) -> ContentPackage:
    data = fallback_content(language)
    label = "English" if language == "en" else "Telugu"
    return ContentPackage(
        title="Top Sports News Today | Daily Bulletin",
        description=f"{data['script']}\n\nsports news, cricket, football, highlights\nLike, Share, Subscribe.",
        tags=[
            "sports news",
            "daily sports news",
            "cricket news",
            "football news",
            "tennis news",
            "olympics news",
            "sports highlights",
            "global sports update",
            "sports shorts",
            "breaking sports news",
        ],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script=data["script"],
        long_script=data["script"],
        highlights=[data["script"]],
        visual_queries=["sports news studio headline"],
        hashtags=["#SportsNews", "#SportsUpdate"],
        language=language,
        language_label=label,
    )


def _safe_topic() -> TopicCandidate:
    return fallback_story_for_date()


def _safe_scored_topic(candidate: TopicCandidate) -> ScoredTopic:
    try:
        return choose_best_topic([candidate])
    except Exception:
        return ScoredTopic(candidate=candidate, score=0.0, decision="FALLBACK", reasons=["fallback"])


def _read_status() -> dict[str, Any]:
    return load_json(STATUS_FILE, default={}) or {}


def _write_status(update: dict[str, Any]) -> None:
    current = _read_status()
    merged = {**current, **update}
    dump_json(merged, STATUS_FILE)


def _write_latest_run(payload: dict[str, Any]) -> None:
    dump_json(payload, LATEST_RUN_FILE)


def _today_key() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _read_signature_state() -> dict[str, Any]:
    latest_run = load_json(LATEST_RUN_FILE, default={}) or {}
    signature_date = str(latest_run.get("signature_date", "")).strip()
    today = _today_key()
    if signature_date and signature_date != today:
        latest_run["signature_date"] = today
        latest_run["signature_history"] = []
        dump_json(latest_run, LATEST_RUN_FILE)
    return latest_run


def _stored_signatures() -> list[str]:
    latest_run = _read_signature_state()
    history = latest_run.get("signature_history", [])
    if isinstance(history, list):
        return [str(item).strip().lower() for item in history if str(item).strip()]
    legacy_signature = str(latest_run.get("headline_signature", "")).strip().lower()
    return [legacy_signature] if legacy_signature else []


def _record_signature(signature: str) -> None:
    if not signature:
        return
    latest_run = _read_signature_state()
    history = latest_run.get("signature_history", [])
    normalized_history = [str(item).strip() for item in history if str(item).strip()]
    normalized_signature = signature.strip()
    if normalized_signature.lower() not in {item.lower() for item in normalized_history}:
        normalized_history.append(normalized_signature)
    latest_run["signature_date"] = _today_key()
    latest_run["signature_history"] = normalized_history[-50:]
    latest_run["headline_signature"] = normalized_signature
    dump_json(latest_run, LATEST_RUN_FILE)


def _safe_remove_path(path: Path) -> None:
    try:
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
        else:
            path.unlink()
    except FileNotFoundError:
        return
    except Exception as exc:
        logger.warning("Cleanup skipped for %s: %s", path, exc)


def _cleanup_old_artifacts(*, keep_work_dir: str | Path | None = None) -> None:
    if not OUTPUT_DIR.exists():
        return

    now = datetime.now().timestamp()
    expiry_seconds = settings.artifact_ttl_hours * 60 * 60

    keep_count = max(1, settings.retain_run_artifacts)
    keep_paths: set[Path] = set()
    if keep_work_dir:
        keep_paths.add(Path(str(keep_work_dir)).resolve())

    latest_run = load_json(LATEST_RUN_FILE, default={}) or {}
    latest_work_dir = latest_run.get("work_dir")
    if latest_work_dir:
        keep_paths.add(Path(str(latest_work_dir)).resolve())

    run_dirs = sorted(
        [item for item in OUTPUT_DIR.iterdir() if item.is_dir()],
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    expired_paths: set[Path] = set()
    for item in run_dirs:
        try:
            age_seconds = now - item.stat().st_mtime
        except Exception:
            continue
        if age_seconds >= expiry_seconds:
            expired_paths.add(item.resolve())

    for item in run_dirs[:keep_count]:
        keep_paths.add(item.resolve())

    preserved_files = {"pipeline_status.json", "latest_run.json"}
    for item in OUTPUT_DIR.iterdir():
        resolved = item.resolve()
        if item.is_dir():
            if resolved in expired_paths:
                _safe_remove_path(item)
                continue
            if resolved in keep_paths:
                continue
            _safe_remove_path(item)
            continue
        if item.name in preserved_files:
            continue
        _safe_remove_path(item)

    if TEMP_DIR.exists():
        for item in TEMP_DIR.iterdir():
            _safe_remove_path(item)


def _append_log(message: str, *, level: str = "info", stage: str | None = None) -> None:
    current = _read_status()
    logs = list(current.get("live_logs", []))
    logs.append(
        {
            "id": f"log-{len(logs) + 1}",
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "stage": stage or "",
            "message": message,
        }
    )
    current["live_logs"] = logs[-120:]
    dump_json(current, STATUS_FILE)
    log_method = getattr(logger, level, logger.info)
    log_method(message)


def _append_notification(message: str) -> None:
    current = _read_status()
    notifications = list(current.get("notifications", []))
    notifications.append(
        {
            "id": f"note-{len(notifications) + 1}",
            "timestamp": datetime.now().isoformat(),
            "message": message,
        }
    )
    current["notifications"] = notifications[-30:]
    dump_json(current, STATUS_FILE)


def _set_stage(
    stage: str,
    label: str,
    *,
    detail: str = "",
    running: bool = True,
    failed: bool = False,
    telegram_stage: str | None = None,
) -> None:
    timestamp = datetime.now().isoformat()
    _write_status(
        {
            "running": running,
            "failed": failed,
            "status": label,
            "current_task": detail or label,
            "last_run_time": timestamp,
            "current_stage": stage,
            "progress_label": label,
        }
    )
    _append_log(detail or label, level="error" if failed else "info", stage=stage)
    if telegram_stage:
        send_stage_notification(telegram_stage, detail)
        _append_notification(f"{label}: {detail}" if detail else label)


def _latest_content_payload() -> dict[str, Any]:
    latest_run = load_json(LATEST_RUN_FILE, default={}) or {}
    work_dir = latest_run.get("work_dir")
    if not work_dir:
        return {}
    return load_json(Path(str(work_dir)) / "content.json", default={}) or {}


def _load_latest_content_package() -> ContentPackage:
    content_payload = _latest_content_payload()
    content_data = content_payload.get("content", {})
    if not content_data:
        return _fallback_package(settings.default_language)
    language = normalize_language(content_data.get("language"))
    return ContentPackage(
        title=content_data.get("title", "Sports Update"),
        description=content_data.get("description", ""),
        tags=content_data.get("tags", []) or [],
        thumbnail_text=content_data.get("thumbnail_text", "SPORTS UPDATE"),
        hook=content_data.get("hook", ""),
        shorts_script=content_data.get("shorts_script", ""),
        long_script=content_data.get("long_script", ""),
        highlights=content_data.get("highlights", []) or [],
        visual_queries=content_data.get("visual_queries", []) or [],
        hashtags=content_data.get("hashtags", []) or [],
        language=language,
        language_label=content_data.get("language_label", "Telugu" if language == "te" else "English"),
    )


def _headline_signature(highlights: list[TopicCandidate], language: str) -> str:
    time_bucket = datetime.now().strftime("%Y-%m-%d|%H:%M")
    return f"{time_bucket}|{language}|" + " | ".join(
        item.title.strip().lower() for item in highlights[: settings.max_daily_highlights]
    )


def _is_duplicate_run(signature: str) -> bool:
    stored = _stored_signatures()
    return bool(signature and signature.lower() in stored)


def _unique_signature(
    *,
    highlights: list[TopicCandidate],
    language: str,
    topic: str,
    attempt: int = 0,
) -> str:
    base = _headline_signature(highlights, language)
    extra = f"|topic={topic.strip().lower()}|attempt={attempt}|rand={random.randint(1000, 9999)}"
    return base + extra


def _apply_duplicate_variation(content: ContentPackage, *, topic: str, attempt: int) -> tuple[ContentPackage, dict[str, str]]:
    timestamp = datetime.now().strftime("%H:%M")
    prefix_pool = VARIATION_PREFIXES_TE if content.language == "te" else VARIATION_PREFIXES_EN
    prefix = prefix_pool[(attempt - 1) % len(prefix_pool)]
    variation_token = f"{prefix} {timestamp}"
    random_token = f"v{random.randint(100, 999)}"

    if content.language == "te":
        intro = f"{variation_token}. {topic} గురించి మరో ముఖ్యమైన కోణం ఇప్పుడు చూద్దాం."
        outro = f"ఈ అప్డేట్ {timestamp} సమయానికి అందుబాటులో ఉన్న సమాచారంపై ఆధారపడి ఉంది."
    else:
        intro = f"{variation_token}. Here is a fresh angle on {topic}."
        outro = f"This update reflects the latest available information as of {timestamp}."

    varied_title = f"{prefix}: {content.title} {timestamp}".strip()[:100]
    varied_thumbnail = f"{prefix} {timestamp}".strip()
    varied_shorts = f"{intro} {content.shorts_script}".strip()
    varied_long = f"{intro} {content.long_script} {outro}".strip()
    varied_highlights = list(content.highlights)
    if varied_highlights:
        varied_highlights[0] = intro[:140]
    else:
        varied_highlights = [intro[:140]]

    varied_queries = list(content.visual_queries)
    if varied_queries:
        varied_queries[0] = f"{varied_queries[0]} latest bulletin {timestamp} {random_token}".strip()
    else:
        varied_queries = [f"professional sports breaking news bulletin {timestamp} {random_token}"]

    varied_tags = list(content.tags)
    for tag in [f"hourly sports update {timestamp}", f"fresh sports bulletin {random_token}"]:
        if tag not in varied_tags:
            varied_tags.append(tag)

    description_suffix = f"\n\nUpdate Time: {timestamp}\nVariation: {random_token}"
    varied_description = f"{content.description.strip()}{description_suffix}".strip()

    varied = ContentPackage(
        title=varied_title,
        description=varied_description,
        tags=varied_tags[:20],
        thumbnail_text=varied_thumbnail,
        hook=intro,
        shorts_script=varied_shorts,
        long_script=varied_long,
        highlights=varied_highlights[:10],
        visual_queries=varied_queries[:10],
        hashtags=content.hashtags,
        language=content.language,
        language_label=content.language_label,
    )
    changes = {
        "prefix": prefix,
        "timestamp": timestamp,
        "random_token": random_token,
    }
    return varied, changes


def _ensure_unique_content(
    content: ContentPackage,
    *,
    highlights: list[TopicCandidate],
    language: str,
    topic: str,
) -> tuple[ContentPackage, str]:
    signature = _unique_signature(highlights=highlights, language=language, topic=topic, attempt=0)
    if not _is_duplicate_run(signature):
        return content, signature

    _append_log(
        f"Duplicate detected for topic '{topic}'. Signature already exists for {_today_key()}. Applying variation and continuing.",
        level="warning",
        stage="duplicate",
    )
    logger.warning("Duplicate detected, applying variation and continuing...")

    for attempt in range(1, 6):
        varied_content, changes = _apply_duplicate_variation(content, topic=topic, attempt=attempt)
        varied_signature = _unique_signature(
            highlights=highlights,
            language=language,
            topic=f"{topic} {changes['prefix']} {changes['timestamp']} {changes['random_token']}",
            attempt=attempt,
        )
        _append_log(
            f"Duplicate variation attempt {attempt}: prefix={changes['prefix']}, timestamp={changes['timestamp']}, token={changes['random_token']}.",
            level="info",
            stage="duplicate",
        )
        if not _is_duplicate_run(varied_signature):
            return varied_content, varied_signature

    fallback_changes = {"prefix": "Retry Update", "timestamp": datetime.now().strftime("%H:%M:%S"), "random_token": f"v{random.randint(1000,9999)}"}
    fallback_content, _ = _apply_duplicate_variation(content, topic=topic, attempt=1)
    fallback_signature = _unique_signature(
        highlights=highlights,
        language=language,
        topic=f"{topic} {fallback_changes['timestamp']} {fallback_changes['random_token']}",
        attempt=99,
    )
    _append_log(
        f"Duplicate persisted after variations. Using fallback unique signature with timestamp={fallback_changes['timestamp']} token={fallback_changes['random_token']}.",
        level="warning",
        stage="duplicate",
    )
    return fallback_content, fallback_signature


def _write_subtitles(script: str, output_path: Path) -> str | None:
    cleaned = " ".join(part.strip() for part in script.splitlines() if part.strip()).strip()
    if not cleaned:
        return None
    chunks = [chunk.strip() for chunk in cleaned.replace("!", ".").replace("?", ".").split(".") if chunk.strip()]
    if not chunks:
        chunks = [cleaned]
    lines: list[str] = []
    cursor = 0
    for index, chunk in enumerate(chunks, start=1):
        lines.append(str(index))
        lines.append(f"00:00:{cursor:02d},000 --> 00:00:{cursor + 4:02d},000")
        lines.append(chunk)
        lines.append("")
        cursor += 4
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return str(output_path)


def _scene_image_paths(highlights: list[TopicCandidate]) -> list[str]:
    paths: list[str] = []
    for item in highlights:
        image_url = getattr(item, "image_url", "") or ""
        if image_url:
            paths.append(image_url)
    return paths


def _validate_video_environment() -> None:
    try:
        from moviepy.editor import AudioFileClip, ImageClip  # noqa: F401

        _append_log("MoviePy is available.", stage="video")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"MoviePy is not available: {exc}") from exc

    ffmpeg_binary = os.getenv("IMAGEIO_FFMPEG_EXE") or settings.ffmpeg_path
    _append_log(f"FFmpeg check: configured value is {ffmpeg_binary}.", stage="video")


def _probe_duration(path: str | Path) -> float | None:
    file_path = Path(str(path))
    if not file_path.exists():
        return None
    command = [
        settings.ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(file_path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return float((result.stdout or "0").strip() or 0)
    except Exception:
        logger.warning("ffprobe unavailable or failed for %s; skipping duration check", file_path)
        return None


def _quality_check_video(path: str | None, *, min_seconds: int, label: str) -> list[str]:
    issues: list[str] = []
    if not path:
        return [f"{label} missing"]
    file_path = Path(str(path))
    if not file_path.exists():
        return [f"{label} file not found"]
    if file_path.stat().st_size < 1024:
        issues.append(f"{label} file too small")
    duration = _probe_duration(file_path) if settings.enable_quality_checks else None
    if duration is not None and duration < min_seconds:
        issues.append(f"{label} duration too short ({duration:.1f}s)")
    return issues


def _validate_thumbnail(path: str | Path | None) -> list[str]:
    if not path:
        return ["thumbnail missing"]
    file_path = Path(str(path))
    if not file_path.exists():
        return ["thumbnail file not found"]
    if file_path.stat().st_size < 10 * 1024:
        return ["thumbnail file too small"]
    try:
        from PIL import Image

        with Image.open(file_path) as image:
            width, height = image.size
            if width < 1280 or height < 720:
                return [f"thumbnail too small ({width}x{height})"]
    except Exception as exc:  # noqa: BLE001
        return [f"thumbnail validation failed: {exc}"]
    return []


def generate_voice_track(script: str, output_path: Path, language: str) -> str | None:
    if not settings.enable_voice or not script.strip():
        return None
    return synthesize_voice(script, str(output_path), lang=language)


def create_video(
    *,
    audio_path: str | None,
    image_path: str | None,
    output_path: Path,
    vertical: bool,
    script: str,
    highlights: list[str],
    visual_queries: list[str],
    scene_image_paths: list[str],
) -> str | None:
    try:
        return build_video(
            audio_path=audio_path,
            image_path=image_path,
            output_path=str(output_path),
            vertical=vertical,
            script=script,
            highlights=highlights,
            visual_queries=visual_queries,
            scene_image_paths=scene_image_paths,
        )
    except Exception as exc:
        _append_log(f"Video generation failed: {exc}", level="error", stage="video")
        send_upload_failure("video_generation", str(exc)[:260])
        raise


def upload_video_safe(
    video_path: str | None,
    content: ContentPackage,
    thumbnail_path: str | None,
    *,
    long_form: bool,
) -> str | None:
    if not video_path or not thumbnail_path:
        return "upload-skipped-missing-artifacts"
    title = content.title.strip()
    description = content.description.strip()
    if long_form:
        title = f"{title[:88]} | Full Bulletin"
    else:
        title = f"{title[:88]} #Shorts"
        if "#shorts" not in description.lower():
            description = f"{description}\n\n#Shorts #Sports"
    try:
        _append_log("Upload started", stage="upload")
        return upload_video(
            video_path=str(video_path),
            title=title,
            description=description,
            tags=content.tags,
            thumbnail_path=str(thumbnail_path),
        )
    except Exception as exc:
        message = str(exc).strip() or "Unknown upload error"
        logger.error("Upload failed: %s", message)
        _append_log(f"Upload failed: {message}", level="error", stage="upload")
        send_upload_failure("upload", message[:260])
        return f"upload-failed: {message[:220]}"


def _attempt_uploads(
    *,
    shorts_video_path: str | None,
    long_video_path: str | None,
    content: ContentPackage,
    thumbnail_path: str | None,
) -> tuple[str | None, str | None]:
    if not settings.enable_upload or not settings.has_youtube_upload:
        skipped = "upload-skipped-missing-credentials"
        return skipped, skipped if settings.enable_long_video else None
    _set_stage("uploading", "Uploading", detail="Uploading long and short videos to YouTube.", telegram_stage="uploading")
    shorts_upload_result = upload_video_safe(shorts_video_path, content, thumbnail_path, long_form=False)
    long_upload_result: str | None = None
    if settings.enable_long_video:
        long_upload_result = upload_video_safe(long_video_path, content, thumbnail_path, long_form=True)
    return shorts_upload_result, long_upload_result


def _build_upload_summary(shorts_upload: str | None, long_upload: str | None) -> str:
    parts = []
    if shorts_upload:
        parts.append(f"shorts={shorts_upload}")
    if long_upload:
        parts.append(f"long={long_upload}")
    return " | ".join(parts)


def _artifact_url(path: str | None) -> str:
    if not path:
        return ""
    file_path = Path(str(path))
    try:
        relative = file_path.resolve().relative_to(OUTPUT_DIR.resolve())
    except Exception:
        return ""
    web_path = str(relative).replace("\\", "/")
    return f"/output/{web_path}"


def _topic_title(value: Any, fallback: str = "") -> str:
    if isinstance(value, TopicCandidate):
        return value.title
    if isinstance(value, dict):
        return str(value.get("title", fallback) or fallback)
    return fallback


def _topic_summary(value: Any, fallback: str = "") -> str:
    if isinstance(value, TopicCandidate):
        return value.summary
    if isinstance(value, dict):
        return str(value.get("summary", fallback) or fallback)
    return fallback


def _run_once(*, mode: str, language: str) -> None:
    selected_topic = _safe_topic()
    scored = _safe_scored_topic(selected_topic)
    content = _fallback_package(language)
    work_dir = OUTPUT_DIR
    shorts_audio_path: str | None = None
    long_audio_path: str | None = None
    shorts_video_path: str | None = None
    long_video_path: str | None = None
    thumbnail_path: str | None = None

    if mode == "upload_only":
        latest_run = load_json(LATEST_RUN_FILE, default={}) or {}
        content = _load_latest_content_package()
        shorts_video_path = latest_run.get("shorts_video") or latest_run.get("video") or None
        long_video_path = latest_run.get("long_video") or None
        thumbnail_path = latest_run.get("thumbnail") or None
        selected_topic = latest_run.get("selected_topic") or selected_topic
        work_dir_value = latest_run.get("work_dir")
        if work_dir_value:
            work_dir = Path(str(work_dir_value))
        if not shorts_video_path and not long_video_path:
            raise RuntimeError("No generated video artifacts found for upload_only mode.")
        shorts_upload_result, long_upload_result = _attempt_uploads(
            shorts_video_path=shorts_video_path,
            long_video_path=long_video_path,
            content=content,
            thumbnail_path=thumbnail_path,
        )
        upload_result = _build_upload_summary(shorts_upload_result, long_upload_result)
        _finalize_success(
            mode=mode,
            language=content.language,
            work_dir=work_dir,
            content=content,
            selected_topic=selected_topic,
            scored=scored,
            highlights=[],
            trends=[],
            shorts_audio_path=latest_run.get("shorts_audio"),
            long_audio_path=latest_run.get("long_audio"),
            shorts_video_path=shorts_video_path,
            long_video_path=long_video_path,
            thumbnail_path=thumbnail_path,
            shorts_upload_result=shorts_upload_result,
            long_upload_result=long_upload_result,
            headline_signature=latest_run.get("headline_signature", ""),
            upload_result=upload_result,
        )
        return

    _set_stage("started", "Processing", detail=f"Starting automation in {content.language_label}.", telegram_stage="started")
    _validate_video_environment()
    candidates, trends = fetch_all_candidates()
    highlights = select_daily_highlights(candidates) if candidates else [_safe_topic()]
    signature = _headline_signature(highlights, language)

    selected_topic = highlights[0]
    try:
        scored = choose_best_topic(highlights)
        selected_topic = scored.candidate
    except Exception as exc:
        logger.error("Scoring failed: %s", exc)

    _set_stage(
        "news_fetched",
        "Processing",
        detail=f"Fetched {len(candidates) or len(highlights)} sports items across cricket, football, tennis, and Olympics.",
        telegram_stage="news_fetched",
    )

    content = generate_content(selected_topic, scored, trends, highlights, language=language)
    content, signature = _ensure_unique_content(
        content,
        highlights=highlights,
        language=language,
        topic=selected_topic.title,
    )
    _set_stage(
        "script_ready",
        "Processing",
        detail=f"{content.language_label} scripts generated for long video and Shorts.",
        telegram_stage="script_ready",
    )

    work_dir = OUTPUT_DIR / f"{datetime.now():%Y%m%d_%H%M%S}_{slugify(content.title or selected_topic.title)}"
    work_dir.mkdir(parents=True, exist_ok=True)

    thumbnail_path = str(create_thumbnail(content.thumbnail_text or "షాక్ న్యూస్", content.thumbnail_idea, work_dir / "thumbnail.jpg"))

    dump_json(
        {
            "mode": mode,
            "language": language,
            "selected_topic": selected_topic,
            "scored_topic": scored,
            "highlights": highlights,
            "content": content,
            "trends": trends,
            "headline_signature": signature,
            "created_at": datetime.now().isoformat(),
        },
        work_dir / "content.json",
    )

    shorts_audio_path = generate_voice_track(content.shorts_script, work_dir / "shorts.mp3", language)
    if settings.enable_long_video:
        long_audio_path = generate_voice_track(content.long_script, work_dir / "long.mp3", language)
    _set_stage(
        "voice_generated",
        "Processing",
        detail=f"Voice tracks generated in {content.language_label}.",
        telegram_stage="voice_generated",
    )

    shorts_video_path = create_video(
        audio_path=shorts_audio_path,
        image_path=thumbnail_path,
        output_path=work_dir / "shorts.mp4",
        vertical=True,
        script=content.shorts_script,
        highlights=content.highlights[:3] or [content.hook],
        visual_queries=content.visual_queries[:3],
        scene_image_paths=_scene_image_paths(highlights[:3]),
    )
    if settings.enable_long_video:
        long_video_path = create_video(
            audio_path=long_audio_path,
            image_path=thumbnail_path,
            output_path=work_dir / "long.mp4",
            vertical=False,
            script=content.long_script,
            highlights=content.highlights,
            visual_queries=content.visual_queries,
            scene_image_paths=_scene_image_paths(highlights),
        )
    _set_stage(
        "video_created",
        "Uploading",
        detail="Long and short videos created with subtitles, visuals, and background music.",
        telegram_stage="video_created",
    )

    thumbnail_issues = _validate_thumbnail(thumbnail_path)
    if thumbnail_issues:
        raise RuntimeError("; ".join(thumbnail_issues))

    issues = _quality_check_video(shorts_video_path, min_seconds=20, label="shorts video")
    if settings.enable_long_video:
        issues.extend(_quality_check_video(long_video_path, min_seconds=120, label="long video"))
    if issues:
        raise RuntimeError("; ".join(issues))

    shorts_upload_result, long_upload_result = _attempt_uploads(
        shorts_video_path=shorts_video_path,
        long_video_path=long_video_path,
        content=content,
        thumbnail_path=thumbnail_path,
    )
    upload_result = _build_upload_summary(shorts_upload_result, long_upload_result)
    _finalize_success(
        mode=mode,
        language=language,
        work_dir=work_dir,
        content=content,
        selected_topic=selected_topic,
        scored=scored,
        highlights=highlights,
        trends=trends,
        shorts_audio_path=shorts_audio_path,
        long_audio_path=long_audio_path,
        shorts_video_path=shorts_video_path,
        long_video_path=long_video_path,
        thumbnail_path=thumbnail_path,
        shorts_upload_result=shorts_upload_result,
        long_upload_result=long_upload_result,
        headline_signature=signature,
        upload_result=upload_result,
    )


def _finalize_success(
    *,
    mode: str,
    language: str,
    work_dir: Path,
    content: ContentPackage,
    selected_topic: TopicCandidate,
    scored: ScoredTopic,
    highlights: list[TopicCandidate],
    trends: list[str],
    shorts_audio_path: str | None,
    long_audio_path: str | None,
    shorts_video_path: str | None,
    long_video_path: str | None,
    thumbnail_path: str | None,
    shorts_upload_result: str | None,
    long_upload_result: str | None,
    headline_signature: str,
    upload_result: str,
) -> None:
    _record_signature(headline_signature)
    _write_latest_run(
        {
            "work_dir": str(work_dir),
            "mode": mode,
            "language": language,
            "title": content.title,
            "selected_topic": selected_topic,
            "scored_topic": scored,
            "highlights": highlights,
            "trends": trends,
            "shorts_audio": shorts_audio_path,
            "long_audio": long_audio_path,
            "shorts_video": shorts_video_path,
            "long_video": long_video_path,
            "thumbnail": thumbnail_path,
            "shorts_upload": shorts_upload_result,
            "long_upload": long_upload_result,
            "upload": upload_result,
            "headline_signature": headline_signature,
            "signature_date": _today_key(),
            "signature_history": _stored_signatures(),
            "completed_at": datetime.now().isoformat(),
        }
    )

    preview_items = []
    if shorts_video_path:
        preview_items.append({"label": "Shorts Preview", "url": _artifact_url(shorts_video_path), "variant": "short"})
    if long_video_path:
        preview_items.append({"label": "Long Video Preview", "url": _artifact_url(long_video_path), "variant": "long"})

    youtube_links = [
        {"label": "Shorts", "url": shorts_upload_result}
        for shorts_upload_result in [shorts_upload_result]
        if shorts_upload_result and shorts_upload_result.startswith("https://")
    ]
    youtube_links.extend(
        {"label": "Long Video", "url": long_upload_result}
        for long_upload_result in [long_upload_result]
        if long_upload_result and long_upload_result.startswith("https://")
    )

    _write_status(
        {
            "running": False,
            "failed": False,
            "status": "Completed",
            "current_task": "Automation completed successfully.",
            "last_run_time": datetime.now().isoformat(),
            "current_stage": "completed",
            "progress_label": "Completed",
            "mode": mode,
            "language": language,
            "language_label": content.language_label,
            "work_dir": str(work_dir),
            "selected_topic": _topic_title(selected_topic, content.title),
            "selected_topic_summary": _topic_summary(selected_topic),
            "thumbnail_url": thumbnail_path,
            "thumbnail_text": content.thumbnail_text,
            "preview_items": preview_items,
            "youtube_links": youtube_links,
            "headline_signature": headline_signature,
        }
    )
    _cleanup_old_artifacts(keep_work_dir=work_dir)
    _append_notification("Automation run completed successfully.")
    if shorts_upload_result and shorts_upload_result.startswith("https://"):
        send_upload_success(content.title, shorts_upload_result, variant="Shorts")
    if long_upload_result and long_upload_result.startswith("https://"):
        send_upload_success(content.title, long_upload_result, variant="Long Video")
    send_stage_notification("all_done", "The full sports automation pipeline finished successfully.")


def run_pipeline(mode: str = "full", language: str | None = None) -> None:
    normalized_language = normalize_language(language)
    if not PIPELINE_LOCK.acquire(blocking=False):
        raise RuntimeError("Automation is already running")

    _write_status(
        {
            "running": True,
            "failed": False,
            "status": "Processing",
            "current_task": "Preparing automation run.",
            "last_run_time": datetime.now().isoformat(),
            "current_stage": "queued",
            "progress_label": "Queued",
            "mode": mode,
            "language": normalized_language,
            "language_label": "Telugu" if normalized_language == "te" else "English",
            "live_logs": [],
            "notifications": [],
        }
    )

    attempts = 1 if mode == "upload_only" else settings.pipeline_retry_limit + 1
    try:
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                _append_log(f"Pipeline attempt {attempt} of {attempts}.", stage="retry")
                _run_once(mode=mode, language=normalized_language)
                return
            except Exception as exc:
                last_error = exc
                _append_log(f"Attempt {attempt} failed: {exc}", level="error", stage="retry")
                if attempt >= attempts:
                    break

        message = str(last_error)[:260] if last_error else "Unknown failure"
        _write_status(
            {
                "running": False,
                "failed": True,
                "status": "Failed",
                "current_task": message,
                "last_run_time": datetime.now().isoformat(),
                "current_stage": "failed",
                "progress_label": "Failed",
            }
        )
        _append_notification(f"Automation failed: {message}")
        send_upload_failure("pipeline", message)
    finally:
        PIPELINE_LOCK.release()


def run_pipeline_logic(mode: str = "full", language: str | None = None) -> None:
    if mode == "test":
        run_test_mode(language)
        return
    run_pipeline(mode, language)


def run_test_mode(language: str | None = None) -> None:
    normalized_language = normalize_language(language)
    work_dir = OUTPUT_DIR / "test_mode"
    work_dir.mkdir(parents=True, exist_ok=True)
    sample_video = work_dir / "output.mp4"

    existing_audio = next(OUTPUT_DIR.rglob("*.mp3"), None)
    existing_image = next(OUTPUT_DIR.rglob("*.jpg"), None)
    if existing_audio and existing_image:
        audio_path = str(existing_audio)
        thumbnail_path = str(existing_image)
    else:
        content = _fallback_package(normalized_language)
        sample_audio = work_dir / "sample.mp3"
        sample_image = work_dir / "sample.jpg"
        thumbnail_path = str(create_thumbnail("TEST MODE", content.thumbnail_idea, sample_image))
        audio_path = generate_voice_track("This is a pipeline test for audio to video generation.", sample_audio, "en")
        if not audio_path:
            raise RuntimeError("Test mode could not create sample audio.")

    video_path = create_video(
        audio_path=audio_path,
        image_path=thumbnail_path,
        output_path=sample_video,
        vertical=True,
        script="This is a pipeline test for audio to video generation.",
        highlights=["Pipeline test scene", "Audio and visuals check", "Automation validation"],
        visual_queries=["sports test graphic", "audio waveform visual", "video automation test card"],
        scene_image_paths=[],
    )
    if not video_path or not Path(video_path).exists():
        raise RuntimeError("Test mode video generation failed.")

    send_stage_notification("video_created", f"Test video created at {video_path}")
    send_stage_notification("all_done", "Telegram test message sent successfully.")


def main() -> None:
    selected_mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    selected_language = sys.argv[2] if len(sys.argv) > 2 else settings.default_language
    run_pipeline_logic(selected_mode, selected_language)


if __name__ == "__main__":
    main()
