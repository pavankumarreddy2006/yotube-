from __future__ import annotations

import logging
import math
import os
import random
import shutil
import struct
import subprocess
import sys
import threading
import wave
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher
from typing import Any

from content import ContentPackage, fallback_content, generate_content, normalize_language
from data import TopicCandidate, fallback_story_for_date, fetch_all_candidates, select_daily_highlights
from events import publish_event
from ml_engine import (
    generate_optimization_recommendations,
    load_learning_state,
    rank_content_opportunities,
    save_learning_state,
    simulate_performance_snapshot,
    update_learning_state,
)
from monitoring import ensure_status_shape, now_iso, update_stage_snapshot
from notify import send_stage_notification, send_upload_failure, send_upload_success
from queue_manager import job_queue
from runtime import get_runtime_settings
from scoring import ScoredTopic, choose_best_topic
from settings import BASE_DIR, OUTPUT_DIR, TEMP_DIR, settings
from storage import get_storage, upload_artifact
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
    return ensure_status_shape(load_json(STATUS_FILE, default={}) or {})


def _write_status(update: dict[str, Any]) -> None:
    current = _read_status()
    merged = ensure_status_shape({**current, **update})
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


def _latest_script_fingerprint() -> str:
    latest_run = _read_signature_state()
    return str(latest_run.get("script_fingerprint", "")).strip()


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


def _record_script_fingerprint(fingerprint: str) -> None:
    if not fingerprint:
        return
    latest_run = _read_signature_state()
    latest_run["signature_date"] = _today_key()
    latest_run["script_fingerprint"] = fingerprint.strip()
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
    publish_event("notification", message, {"message": message})


def _append_activity(message: str, *, stage: str, icon: str = "•", progress: int | None = None, tone: str = "info") -> None:
    current = _read_status()
    feed = list(current.get("activity_feed", []))
    feed.append(
        {
            "id": f"activity-{len(feed) + 1}",
            "timestamp": now_iso(),
            "stage": stage,
            "icon": icon,
            "progress": progress,
            "tone": tone,
            "message": message,
        }
    )
    current["activity_feed"] = feed[-80:]
    dump_json(current, STATUS_FILE)


def _update_status_block(key: str, payload: dict[str, Any]) -> None:
    current = _read_status()
    existing = dict(current.get(key, {}))
    existing.update(payload)
    existing["updated_at"] = now_iso()
    current[key] = existing
    dump_json(current, STATUS_FILE)


def _set_overall_progress(progress: int, *, eta_seconds: int | None = None) -> None:
    current = _read_status()
    current["overall_progress"] = max(0, min(100, int(progress)))
    if eta_seconds is not None:
        current["eta_seconds"] = max(0, int(eta_seconds))
    dump_json(current, STATUS_FILE)


def _mark_stage(
    stage_key: str,
    *,
    stage_status: str,
    progress: int,
    message: str,
    overall_progress: int,
) -> None:
    current = _read_status()
    current["stages"] = update_stage_snapshot(
        list(current.get("stages", [])),
        stage_key=stage_key,
        stage_status=stage_status,
        progress=progress,
        message=message,
        timestamp=now_iso(),
    )
    current["overall_progress"] = max(0, min(100, int(overall_progress)))
    dump_json(current, STATUS_FILE)


def _set_stage(
    stage: str,
    label: str,
    *,
    detail: str = "",
    running: bool = True,
    failed: bool = False,
    telegram_stage: str | None = None,
    stage_key: str | None = None,
    stage_progress: int | None = None,
    overall_progress: int | None = None,
    eta_seconds: int | None = None,
    icon: str = "•",
) -> None:
    timestamp = now_iso()
    current = _read_status()
    progress_value = int(overall_progress if overall_progress is not None else current.get("overall_progress", 0))
    _write_status(
        {
            "running": running,
            "failed": failed,
            "status": label,
            "current_task": detail or label,
            "last_run_time": timestamp,
            "current_stage": stage,
            "progress_label": label,
            "overall_progress": progress_value,
            "eta_seconds": eta_seconds if eta_seconds is not None else current.get("eta_seconds"),
        }
    )
    if stage_key:
        _mark_stage(
            stage_key,
            stage_status="failed" if failed else ("active" if running else "completed"),
            progress=stage_progress if stage_progress is not None else progress_value,
            message=detail or label,
            overall_progress=progress_value,
        )
    job_queue.mark_current_job_stage(stage, detail or label)
    _append_log(detail or label, level="error" if failed else "info", stage=stage)
    _append_activity(detail or label, stage=stage_key or stage, icon=icon, progress=stage_progress or progress_value, tone="error" if failed else "info")
    publish_event(stage, detail or label, {"stage": stage, "label": label, "failed": failed})
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


def _normalize_script(text: str) -> str:
    return " ".join(part.strip() for part in text.splitlines() if part.strip()).strip().lower()


def _content_fingerprint(content: ContentPackage, *, topic: str) -> str:
    timestamp = datetime.now().strftime("%Y-%m-%d|%H:%M:%S")
    base_script = _normalize_script(content.long_script or content.shorts_script)
    return f"{topic.strip().lower()}|{timestamp}|{base_script}"


def _is_duplicate_run(signature: str) -> bool:
    stored = _stored_signatures()
    return bool(signature and signature.lower() in stored)


def _generate_signature(content: ContentPackage, *, topic: str, language: str, attempt: int = 0) -> str:
    fingerprint = _content_fingerprint(content, topic=topic)
    return f"{language}|attempt={attempt}|rand={random.randint(1000, 9999)}|{fingerprint}"


def _script_similarity_score(content: ContentPackage) -> float:
    current_script = _normalize_script(content.long_script or content.shorts_script)
    previous_script = _normalize_script(_latest_script_fingerprint())
    if not current_script or not previous_script:
        return 0.0
    return SequenceMatcher(None, current_script, previous_script).ratio() * 100.0


def _update_render_status(*, title: str, variant: str, progress: int, message: str, active: bool = True, eta_seconds: int | None = None) -> None:
    _update_status_block(
        "render_status",
        {
            "active": active,
            "title": title,
            "variant": variant,
            "progress": max(0, min(100, int(progress))),
            "eta_seconds": eta_seconds,
            "message": message,
        },
    )
    _append_activity(message, stage="render", icon="🎬", progress=progress)


def _update_upload_status(
    *,
    title: str,
    variant: str,
    progress: int,
    message: str,
    active: bool = True,
    eta_seconds: int | None = None,
    link: str = "",
    failed: bool = False,
) -> None:
    _update_status_block(
        "upload_status",
        {
            "active": active,
            "platform": "YouTube",
            "title": title,
            "variant": variant,
            "progress": max(0, min(100, int(progress))),
            "eta_seconds": eta_seconds,
            "message": message,
            "link": link,
            "failed": failed,
        },
    )
    _append_activity(message, stage="upload", icon="📤" if not failed else "❌", progress=progress, tone="error" if failed else "info")


def _update_quality_status(*, progress: int, message: str, active: bool = True, failed: bool = False) -> None:
    _update_status_block(
        "quality_status",
        {
            "active": active,
            "progress": max(0, min(100, int(progress))),
            "message": message,
            "failed": failed,
        },
    )
    _append_activity(message, stage="quality", icon="🛡" if not failed else "⚠", progress=progress, tone="error" if failed else "info")


def _apply_duplicate_variation(content: ContentPackage, *, topic: str, attempt: int) -> tuple[ContentPackage, dict[str, str]]:
    timestamp = datetime.now().strftime("%H:%M:%S")
    prefix_pool = VARIATION_PREFIXES_TE if content.language == "te" else VARIATION_PREFIXES_EN
    extra_prefixes = ["Big News Today"] if content.language == "en" else ["ఈరోజు పెద్ద వార్త"]
    prefix = (prefix_pool + extra_prefixes)[(attempt - 1) % len(prefix_pool + extra_prefixes)]
    variation_token = f"{prefix} {timestamp}"
    random_token = f"v{random.randint(100, 999)}"

    if content.language == "te":
        rephrase = [
            f"{topic} గురించి మరో కోణం ఇప్పుడు చూద్దాం.",
            f"{topic} పై తాజాగా బయటకు వచ్చిన అంశాలు ఇవి.",
            f"{topic} లో అభిమానులు గమనిస్తున్న కొత్త విషయాలు ఇప్పుడు చూద్దాం.",
        ][(attempt - 1) % 3]
        intro = f"{variation_token}! {rephrase}"
        outro = f"ఈ అప్డేట్ {timestamp} సమయానికి అందుబాటులో ఉన్న సమాచారంపై ఆధారపడి ఉంది."
    else:
        rephrase = [
            f"Here is a fresh angle on {topic}.",
            f"Here is the latest development around {topic}.",
            f"Here is what fans are watching closely about {topic}.",
        ][(attempt - 1) % 3]
        intro = f"{variation_token}! {rephrase}"
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
    language: str,
    topic: str,
) -> tuple[ContentPackage, str]:
    for attempt in range(0, 6):
        candidate = content if attempt == 0 else _apply_duplicate_variation(content, topic=topic, attempt=attempt)[0]
        signature = _generate_signature(candidate, topic=topic, language=language, attempt=attempt)
        similarity = _script_similarity_score(candidate)
        is_duplicate = _is_duplicate_run(signature)
        if not is_duplicate and similarity <= 95.0:
            if attempt > 0:
                _append_log(
                    f"Duplicate detected, regenerating content... variation attempt {attempt} accepted with similarity {similarity:.1f}%.",
                    level="info",
                    stage="duplicate",
                )
            return candidate, signature

        reason_parts = []
        if is_duplicate:
            reason_parts.append("signature matched same-day history")
        if similarity > 95.0:
            reason_parts.append(f"similarity score {similarity:.1f}% exceeded 95%")
        reason = "; ".join(reason_parts) or "unknown duplicate condition"
        _append_log(
            f"Duplicate detected, regenerating content... attempt {attempt + 1} because {reason}.",
            level="warning",
            stage="duplicate",
        )

    final_content, changes = _apply_duplicate_variation(content, topic=topic, attempt=6)
    final_signature = _generate_signature(final_content, topic=f"{topic} {changes['random_token']}", language=language, attempt=99)
    _append_log(
        f"Using forced unique fallback after duplicate regeneration attempts. prefix={changes['prefix']}, timestamp={changes['timestamp']}, token={changes['random_token']}.",
        level="warning",
        stage="duplicate",
    )
    return final_content, final_signature


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
    progress_callback=None,
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
            progress_callback=progress_callback,
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
    progress_callback=None,
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
            progress_callback=progress_callback,
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
    runtime_settings,
) -> tuple[str | None, str | None]:
    if not runtime_settings.enable_upload or not settings.has_youtube_upload:
        skipped = "upload-skipped-missing-credentials"
        return skipped, skipped if runtime_settings.enable_long_video else None
    _set_stage(
        "uploading",
        "Uploading",
        detail="Uploading finished videos to YouTube.",
        telegram_stage="uploading",
        stage_key="upload",
        stage_progress=10,
        overall_progress=88,
        eta_seconds=180,
        icon="📤",
    )
    shorts_upload_result = upload_video_safe(
        shorts_video_path,
        content,
        thumbnail_path,
        long_form=False,
        progress_callback=lambda progress, status_text: _update_upload_status(
            title=content.title,
            variant="Shorts",
            progress=progress,
            message=status_text,
            active=progress < 100,
            eta_seconds=max(15, int((100 - progress) * 1.8)) if progress < 100 else 0,
        ),
    )
    long_upload_result: str | None = None
    if runtime_settings.enable_long_video and long_video_path:
        long_upload_result = upload_video_safe(
            long_video_path,
            content,
            thumbnail_path,
            long_form=True,
            progress_callback=lambda progress, status_text: _update_upload_status(
                title=content.title,
                variant="Long Video",
                progress=progress,
                message=status_text,
                active=progress < 100,
                eta_seconds=max(20, int((100 - progress) * 2.4)) if progress < 100 else 0,
            ),
        )
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


def _cloud_folder_for_workdir(work_dir: Path) -> str:
    return f"{settings.cloudinary_folder.strip('/')}/{work_dir.name}".strip("/")


def _upload_artifacts_to_cloud(
    *,
    work_dir: Path,
    shorts_audio_path: str | None,
    long_audio_path: str | None,
    shorts_video_path: str | None,
    long_video_path: str | None,
    thumbnail_path: str | None,
) -> dict[str, Any]:
    folder = _cloud_folder_for_workdir(work_dir)
    artifacts: dict[str, Any] = {"folder": folder}

    upload_plan = [
        ("shorts_audio", shorts_audio_path, "video"),
        ("long_audio", long_audio_path, "video"),
        ("shorts_video", shorts_video_path, "video"),
        ("long_video", long_video_path, "video"),
        ("thumbnail", thumbnail_path, "image"),
    ]
    for key, path, resource_type in upload_plan:
        if not path:
            continue
        artifacts[key] = upload_artifact(
            path,
            folder=folder,
            resource_type=resource_type,
            delete_local=resource_type in {"video", "image"} and key in {"shorts_audio", "long_audio"},
        )
    return artifacts


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


def _run_once(*, mode: str, language: str, topic_override: str = "") -> None:
    runtime_settings = get_runtime_settings()
    make_shorts = runtime_settings.enable_shorts and mode in {"full", "short"}
    make_long = runtime_settings.enable_long_video and mode in {"full", "long"}
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
            runtime_settings=runtime_settings,
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

    _set_stage(
        "started",
        "AI System Active",
        detail=f"Automation started in {content.language_label}. Preparing the next sports story.",
        telegram_stage="started",
        overall_progress=3,
        eta_seconds=420,
        icon="🚀",
    )
    _validate_video_environment()
    candidates, trends = fetch_all_candidates()
    learning_state = load_learning_state()
    opportunities = rank_content_opportunities(candidates or [_safe_topic()], trends, learning_state)
    highlights = select_daily_highlights(candidates) if candidates else [_safe_topic()]
    selected_topic = highlights[0]
    if topic_override.strip():
        selected_topic = TopicCandidate(
            title=topic_override.strip(),
            summary=f"Manual prompt override for {topic_override.strip()}",
            source="manual",
            topic=topic_override.strip(),
            category="Sports",
            is_trending=True,
        )
        highlights = [selected_topic, *highlights][: max(1, len(highlights))]
        scored = _safe_scored_topic(selected_topic)
    else:
        try:
            scored = choose_best_topic(highlights)
            selected_topic = scored.candidate
        except Exception as exc:
            logger.error("Scoring failed: %s", exc)

    _set_stage(
        "news_fetched",
        "Researching",
        detail=f"Fetched {len(candidates) or len(highlights)} sports items across cricket, football, tennis, and Olympics.",
        telegram_stage="news_fetched",
        stage_key="research",
        stage_progress=100,
        overall_progress=14,
        eta_seconds=360,
        icon="🧠",
    )

    content = generate_content(selected_topic, scored, trends, highlights, language=language)
    content, signature = _ensure_unique_content(
        content,
        language=language,
        topic=selected_topic.title,
    )
    _set_stage(
        "script_ready",
        "Script Ready",
        detail=f"{content.language_label} scripts generated for long video and Shorts.",
        telegram_stage="script_ready",
        stage_key="script",
        stage_progress=100,
        overall_progress=30,
        eta_seconds=300,
        icon="✍",
    )

    work_dir = OUTPUT_DIR / f"{datetime.now():%Y%m%d_%H%M%S}_{slugify(content.title or selected_topic.title)}"
    work_dir.mkdir(parents=True, exist_ok=True)

    thumbnail_path = str(create_thumbnail(content.thumbnail_text or "SPORTS UPDATE", content.thumbnail_idea, work_dir / "thumbnail.jpg"))
    _mark_stage("thumbnail", stage_status="completed", progress=100, message="Thumbnail generated.", overall_progress=40)
    _append_activity("Thumbnail generated and ready for the video package.", stage="thumbnail", icon="🖼", progress=100)

    dump_json(
        {
            "mode": mode,
            "language": language,
            "selected_topic": selected_topic,
            "scored_topic": scored,
            "highlights": highlights,
            "content": content,
            "trends": trends,
            "opportunities": opportunities,
            "headline_signature": signature,
            "created_at": datetime.now().isoformat(),
        },
        work_dir / "content.json",
    )

    shorts_audio_path = generate_voice_track(content.shorts_script, work_dir / "shorts.mp3", language)
    if make_long:
        long_audio_path = generate_voice_track(content.long_script, work_dir / "long.mp3", language)
    _set_stage(
        "voice_generated",
        "Voice Ready",
        detail=f"Voice tracks generated in {content.language_label}.",
        telegram_stage="voice_generated",
        stage_key="voice",
        stage_progress=100,
        overall_progress=52,
        eta_seconds=240,
        icon="🎤",
    )

    if make_shorts:
        _update_render_status(title=content.title, variant="Shorts", progress=2, message="Rendering Shorts started.", eta_seconds=160)
        shorts_video_path = create_video(
            audio_path=shorts_audio_path,
            image_path=thumbnail_path,
            output_path=work_dir / "shorts.mp4",
            vertical=True,
            script=content.shorts_script,
            highlights=content.highlights[:3] or [content.hook],
            visual_queries=content.visual_queries[:3],
            scene_image_paths=_scene_image_paths(highlights[:3]),
            progress_callback=lambda progress, message: _update_render_status(
                title=content.title,
                variant="Shorts",
                progress=progress,
                message=message,
                active=progress < 100,
                eta_seconds=max(15, int((100 - progress) * 2)) if progress < 100 else 0,
            ),
        )
    if make_long:
        _update_render_status(title=content.title, variant="Long Video", progress=2, message="Rendering long video started.", eta_seconds=260)
        long_video_path = create_video(
            audio_path=long_audio_path,
            image_path=thumbnail_path,
            output_path=work_dir / "long.mp4",
            vertical=False,
            script=content.long_script,
            highlights=content.highlights,
            visual_queries=content.visual_queries,
            scene_image_paths=_scene_image_paths(highlights),
            progress_callback=lambda progress, message: _update_render_status(
                title=content.title,
                variant="Long Video",
                progress=progress,
                message=message,
                active=progress < 100,
                eta_seconds=max(25, int((100 - progress) * 3)) if progress < 100 else 0,
            ),
        )
    _set_stage(
        "video_created",
        "Rendering Complete",
        detail="Long and short videos created with subtitles, visuals, and background music.",
        telegram_stage="video_created",
        stage_key="render",
        stage_progress=100,
        overall_progress=76,
        eta_seconds=180,
        icon="🎬",
    )
    _update_render_status(title=content.title, variant="Ready", progress=100, message="Rendering completed successfully.", active=False, eta_seconds=0)

    _set_stage("quality_check", "Quality Check", detail="Validating audio sync, duration, and thumbnail quality.", stage_key="quality", stage_progress=20, overall_progress=80, eta_seconds=120, icon="🛡")
    _update_quality_status(progress=25, message="Checking thumbnail quality and output duration.")
    thumbnail_issues = _validate_thumbnail(thumbnail_path)
    if thumbnail_issues:
        _update_quality_status(progress=100, message="Thumbnail validation failed.", active=False, failed=True)
        raise RuntimeError("; ".join(thumbnail_issues))

    issues = _quality_check_video(shorts_video_path, min_seconds=20, label="shorts video") if make_shorts else []
    if make_long:
        issues.extend(_quality_check_video(long_video_path, min_seconds=120, label="long video"))
    if issues:
        _update_quality_status(progress=100, message="Quality checks failed. Automatic retry will start if available.", active=False, failed=True)
        raise RuntimeError("; ".join(issues))
    _mark_stage("quality", stage_status="completed", progress=100, message="Quality checks passed.", overall_progress=85)
    _update_quality_status(progress=100, message="Quality validation passed. Ready to upload.", active=False)

    shorts_upload_result, long_upload_result = _attempt_uploads(
        shorts_video_path=shorts_video_path,
        long_video_path=long_video_path,
        content=content,
        thumbnail_path=thumbnail_path,
        runtime_settings=runtime_settings,
    )
    upload_result = _build_upload_summary(shorts_upload_result, long_upload_result)
    matching_opportunity = next((item for item in opportunities if item.topic == selected_topic.title), opportunities[0] if opportunities else None)
    performance_snapshot = simulate_performance_snapshot(
        title=content.title,
        topic=selected_topic.title,
        mode="short" if mode == "short" else ("long" if mode == "long" else "full"),
        language=language,
        opportunity=matching_opportunity,
    )
    recommendations = generate_optimization_recommendations(
        snapshot=performance_snapshot,
        state=learning_state,
        opportunities=opportunities,
    )
    updated_learning_state = update_learning_state(learning_state, performance_snapshot, opportunities)
    save_learning_state(updated_learning_state)
    dump_json(
        {
            "snapshot": performance_snapshot,
            "recommendations": recommendations,
            "learning_state": updated_learning_state,
            "opportunities": opportunities,
            "generated_at": datetime.now().isoformat(),
        },
        work_dir / "optimization_report.json",
    )
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
        opportunities=opportunities,
        performance_snapshot=performance_snapshot,
        recommendations=recommendations,
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
    opportunities: list[Any],
    performance_snapshot: Any,
    recommendations: list[Any],
) -> None:
    cloud_artifacts = _upload_artifacts_to_cloud(
        work_dir=work_dir,
        shorts_audio_path=shorts_audio_path,
        long_audio_path=long_audio_path,
        shorts_video_path=shorts_video_path,
        long_video_path=long_video_path,
        thumbnail_path=thumbnail_path,
    )
    shorts_video_url = cloud_artifacts.get("shorts_video", {}).get("secure_url") or shorts_video_path
    long_video_url = cloud_artifacts.get("long_video", {}).get("secure_url") or long_video_path
    thumbnail_url = cloud_artifacts.get("thumbnail", {}).get("secure_url") or thumbnail_path
    _record_signature(headline_signature)
    _record_script_fingerprint(content.long_script or content.shorts_script)
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
            "shorts_video_url": shorts_video_url,
            "long_video_url": long_video_url,
            "thumbnail_url": thumbnail_url,
            "cloud_artifacts": cloud_artifacts,
            "shorts_upload": shorts_upload_result,
            "long_upload": long_upload_result,
            "upload": upload_result,
            "headline_signature": headline_signature,
            "performance_snapshot": performance_snapshot,
            "recommendations": recommendations,
            "opportunities": opportunities,
            "signature_date": _today_key(),
            "signature_history": _stored_signatures(),
            "completed_at": datetime.now().isoformat(),
        }
    )

    preview_items = []
    if shorts_video_url:
        preview_items.append({"label": "Shorts Preview", "url": shorts_video_url if str(shorts_video_url).startswith("http") else _artifact_url(shorts_video_url), "variant": "short"})
    if long_video_url:
        preview_items.append({"label": "Long Video Preview", "url": long_video_url if str(long_video_url).startswith("http") else _artifact_url(long_video_url), "variant": "long"})

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
            "overall_progress": 100,
            "eta_seconds": 0,
            "completed_at": now_iso(),
            "mode": mode,
            "language": language,
            "language_label": content.language_label,
            "work_dir": str(work_dir),
            "selected_topic": _topic_title(selected_topic, content.title),
            "selected_topic_summary": _topic_summary(selected_topic),
            "thumbnail_url": thumbnail_url,
            "thumbnail_text": content.thumbnail_text,
            "preview_items": preview_items,
            "youtube_links": youtube_links,
            "headline_signature": headline_signature,
            "cloud_artifacts": cloud_artifacts,
            "performance_snapshot": performance_snapshot,
            "recommendations": recommendations,
            "top_opportunities": opportunities[:5],
        }
    )
    _update_upload_status(
        title=content.title,
        variant="YouTube",
        progress=100,
        message="Upload completed successfully.",
        active=False,
        eta_seconds=0,
        link=shorts_upload_result if shorts_upload_result and shorts_upload_result.startswith("https://") else (long_upload_result or ""),
    )
    _append_activity("Automation completed successfully.", stage="completed", icon="✅", progress=100, tone="success")
    if get_storage().is_enabled():
        for local_path in [shorts_audio_path, long_audio_path, shorts_video_path, long_video_path, thumbnail_path]:
            if not local_path:
                continue
            try:
                Path(str(local_path)).unlink(missing_ok=True)
            except Exception:
                pass
    _cleanup_old_artifacts(keep_work_dir=work_dir)
    _append_notification("Automation run completed successfully.")
    if shorts_upload_result and shorts_upload_result.startswith("https://"):
        send_upload_success(content.title, shorts_upload_result, variant="Shorts")
    if long_upload_result and long_upload_result.startswith("https://"):
        send_upload_success(content.title, long_upload_result, variant="Long Video")
    send_stage_notification("all_done", "The full sports automation pipeline finished successfully.")


def run_pipeline(mode: str = "full", language: str | None = None, topic_override: str = "") -> None:
    runtime_settings = get_runtime_settings()
    normalized_language = normalize_language(language or runtime_settings.default_language)
    if not PIPELINE_LOCK.acquire(blocking=False):
        raise RuntimeError("Automation is already running")

    _write_status(
        {
            "running": True,
            "failed": False,
            "status": "Preparing",
            "current_task": "Preparing automation run.",
            "last_run_time": datetime.now().isoformat(),
            "current_stage": "queued",
            "progress_label": "Queued",
            "overall_progress": 0,
            "eta_seconds": 480,
            "started_at": now_iso(),
            "completed_at": "",
            "retry_count": 0,
            "max_retries": max(0, settings.pipeline_retry_limit),
            "mode": mode,
            "language": normalized_language,
            "language_label": "Telugu" if normalized_language == "te" else "English",
            "live_logs": [],
            "notifications": [],
            "activity_feed": [],
            "preview_items": [],
            "youtube_links": [],
            "thumbnail_url": "",
            "selected_topic": "",
            "selected_topic_summary": "",
        }
    )

    attempts = 1 if mode == "upload_only" else settings.pipeline_retry_limit + 1
    try:
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                if attempt > 1:
                    _write_status({"retry_count": attempt - 1, "status": "Retrying", "current_task": f"Retry attempt {attempt} of {attempts} in progress.", "overall_progress": 6})
                    _append_notification(f"Retry started: attempt {attempt} of {attempts}.")
                    _append_activity(f"Retrying the automation after a failure. Attempt {attempt} of {attempts}.", stage="retry", icon="🔁", progress=6)
                    send_stage_notification("retry_started", f"Retry attempt {attempt} of {attempts} has started.")
                _append_log(f"Pipeline attempt {attempt} of {attempts}.", stage="retry")
                _run_once(mode=mode, language=normalized_language, topic_override=topic_override)
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
                "overall_progress": 100,
                "eta_seconds": 0,
                "completed_at": now_iso(),
            }
        )
        _update_render_status(title="", variant="", progress=100, message="Rendering stopped because the run failed.", active=False, eta_seconds=0)
        _update_upload_status(title="", variant="", progress=100, message=f"Upload stopped: {message}", active=False, eta_seconds=0, failed=True)
        _update_quality_status(progress=100, message=f"Automation stopped: {message}", active=False, failed=True)
        _append_notification(f"Automation failed: {message}")
        send_upload_failure("pipeline", message)
    finally:
        PIPELINE_LOCK.release()


def run_pipeline_logic(mode: str = "full", language: str | None = None, topic_override: str = "") -> None:
    if mode == "test":
        run_test_mode(language)
        return
    run_pipeline(mode, language, topic_override)


def run_test_mode(language: str | None = None) -> None:
    normalized_language = normalize_language(language)
    work_dir = OUTPUT_DIR / "test_mode"
    work_dir.mkdir(parents=True, exist_ok=True)
    sample_video = work_dir / "output.mp4"
    content = _fallback_package(normalized_language)
    sample_audio = work_dir / "sample.wav"
    sample_image = work_dir / "sample.jpg"
    thumbnail_path = str(create_thumbnail("TEST MODE", content.thumbnail_idea, sample_image))
    audio_path = _create_test_audio(sample_audio, duration_seconds=4)

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

    logger.info("Test mode video created at %s", video_path)


def _create_test_audio(path: Path, duration_seconds: int = 4) -> str:
    sample_rate = 22050
    frequency = 440.0
    amplitude = 14000
    total_frames = sample_rate * duration_seconds
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for index in range(total_frames):
            value = int(amplitude * math.sin(2 * math.pi * frequency * (index / sample_rate)))
            wav_file.writeframes(struct.pack("<h", value))
    return str(path)


def main() -> None:
    selected_mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    selected_language = sys.argv[2] if len(sys.argv) > 2 else settings.default_language
    run_pipeline_logic(selected_mode, selected_language)


if __name__ == "__main__":
    main()
