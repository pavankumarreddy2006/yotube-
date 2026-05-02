from __future__ import annotations

import logging
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from content import ContentPackage, fallback_content as content_fallback_content, generate_content
from data import TopicCandidate, fallback_story_for_date, fetch_all_candidates
from notify import send_telegram
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


@dataclass
class PipelineResult:
    selected_topic: TopicCandidate
    scored_topic: ScoredTopic
    content: ContentPackage
    shorts_video: str = ""
    long_video: str = ""
    thumbnail: str = ""


def fallback_content() -> dict[str, str]:
    return content_fallback_content()


def _fallback_package() -> ContentPackage:
    data = fallback_content()
    return ContentPackage(
        title=data["title"],
        description=f"{data['script']}\n\nsports news, cricket, football, highlights\nLike, Share, Subscribe.",
        tags=["sports news", "cricket", "football", "highlights", "sports update", "breaking news", "match highlights", "cricket news", "football news", "viral sports"],
        thumbnail_text="SPORTS UPDATE",
        hook=data["script"],
        shorts_script_telugu=data["script"],
        long_script_english=data["script"] if settings.enable_long_video else "",
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


def generate_voice(content: ContentPackage, work_dir: Path) -> str | None:
    if not settings.enable_voice:
        logger.info("Voice generation disabled")
        return None
    script = " ".join(part for part in [content.hook, content.shorts_script] if part).strip()
    if not script:
        script = fallback_content()["script"]
    return synthesize_voice(script, str(work_dir / "shorts.mp3"))


def create_video(audio_path: str | None, work_dir: Path) -> str | None:
    if not audio_path:
        return None
    return build_video(
        audio_path=str(audio_path),
        output_path=str(work_dir / "shorts.mp4"),
        background_path=str(settings.background_video_vertical),
        vertical=True,
    )


def upload_video_safe(video_path: str | None, content: ContentPackage, thumbnail_path: str | None) -> str | None:
    if not video_path or not thumbnail_path:
        logger.info("Upload skipped because video or thumbnail is unavailable")
        return "upload-skipped-missing-artifacts"
    try:
        return upload_video(
            video_path=str(video_path),
            title=content.title,
            description=content.description,
            tags=content.tags,
            thumbnail_path=str(thumbnail_path),
        )
    except Exception as exc:
        logger.error("Upload failed: %s", exc)
        return f"upload-failed: {str(exc)[:180]}"


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
        long_script_english=content_data.get("long_script_english", content_data.get("long_script", "")),
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


def run_pipeline(mode: str = "full") -> None:
    logging.info("Pipeline started")

    _write_status({
        "running": True,
        "failed": False,
        "status": "Running",
        "current_task": "Starting pipeline",
        "last_run_time": datetime.now().isoformat(),
        "mode": mode,
    })

    candidates: list[TopicCandidate] = []
    trends: list[str] = []
    selected_topic = _safe_topic()
    scored = _safe_scored_topic(selected_topic)
    content = _fallback_package()
    audio_path: str | None = None
    video_path: str | None = None
    thumbnail_path: str | None = None
    upload_result: str | None = None
    work_dir = OUTPUT_DIR

    try:
        if mode == "upload_only":
            latest_run = load_json(OUTPUT_DIR / "latest_run.json", default={}) or {}
            content = _load_latest_content_package()
            video_path = latest_run.get("video") or None
            thumbnail_path = latest_run.get("thumbnail") or None
            work_dir_value = latest_run.get("work_dir")
            if work_dir_value:
                work_dir = Path(str(work_dir_value))

            upload_result = upload_video_safe(video_path, content, thumbnail_path)
            _write_latest_run({
                "work_dir": str(work_dir),
                "title": content.title,
                "video": video_path,
                "audio": latest_run.get("audio"),
                "thumbnail": thumbnail_path,
                "upload": upload_result,
                "completed_at": datetime.now().isoformat(),
            })
            _write_status({
                "running": False,
                "failed": False,
                "status": "Completed",
                "current_task": "Upload-only pipeline completed",
                "last_run_time": datetime.now().isoformat(),
                "mode": mode,
                "work_dir": str(work_dir),
                "video": video_path,
                "thumbnail_url": thumbnail_path,
                "thumbnail_text": content.thumbnail_text,
                "notifications": _build_notifications(upload_result, work_dir),
            })
            return

        try:
            candidates, trends = fetch_all_candidates()
        except Exception as e:
            logging.error("Data fetch failed: %s", e)
            candidates = []
            trends = []

        if candidates:
            try:
                scored = choose_best_topic(candidates)
                selected_topic = scored.candidate
            except Exception as e:
                logging.error("Scoring failed: %s", e)
                selected_topic = candidates[0]
                scored = _safe_scored_topic(selected_topic)
        else:
            selected_topic = _safe_topic()
            scored = _safe_scored_topic(selected_topic)

        if getattr(scored, "decision", "") == "SKIP":
            selected_topic = _safe_topic()
            scored = _safe_scored_topic(selected_topic)

        try:
            content = generate_content(selected_topic, scored, trends)
        except Exception as e:
            logging.error("Content generation failed: %s", e)
            content = _fallback_package()

        try:
            work_dir = OUTPUT_DIR / f"{datetime.now():%Y%m%d_%H%M%S}_{slugify(content.title or selected_topic.title)}"
            work_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            work_dir = OUTPUT_DIR

        try:
            dump_json({
                "mode": mode,
                "selected_topic": selected_topic,
                "scored_topic": scored,
                "content": content,
                "trends": trends,
            }, work_dir / "content.json")
        except Exception as e:
            logging.error("JSON save failed: %s", e)

        if mode != "upload_only":
            try:
                thumbnail_path = str(create_thumbnail(
                    content.thumbnail_text or "Telugu Sports Update",
                    content.thumbnail_idea,
                    work_dir / "thumbnail.jpg",
                ))
            except Exception as e:
                logging.error("Thumbnail failed: %s", e)
                thumbnail_path = None

            try:
                audio_path = generate_voice(content, work_dir)
            except Exception as e:
                logging.error("Voice failed: %s", e)
                audio_path = None

            try:
                video_path = create_video(audio_path, work_dir)
            except Exception as e:
                logging.error("Video failed: %s", e)
                video_path = None

        upload_result = upload_video_safe(video_path, content, thumbnail_path)

        _write_latest_run({
            "work_dir": str(work_dir),
            "title": content.title,
            "video": video_path,
            "audio": audio_path,
            "thumbnail": thumbnail_path,
            "upload": upload_result,
            "completed_at": datetime.now().isoformat(),
        })

        _write_status({
            "running": False,
            "failed": bool(upload_result and upload_result.startswith("upload-failed:")),
            "status": "Completed with upload issue" if upload_result and upload_result.startswith("upload-failed:") else "Completed",
            "current_task": upload_result if upload_result and upload_result.startswith("upload-failed:") else "Pipeline completed",
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
            "work_dir": str(work_dir),
            "video": video_path,
            "thumbnail_url": thumbnail_path,
            "thumbnail_text": content.thumbnail_text,
            "notifications": _build_notifications(upload_result, work_dir),
        })

        try:
            send_telegram("Automation completed")
        except Exception:
            logging.warning("Telegram failed, skipping")
    except Exception as e:
        logging.error("Pipeline recovered from error: %s", e)
        _write_status({
            "running": False,
            "failed": True,
            "status": "Completed with fallback",
            "current_task": f"Recovered from error: {str(e)[:120]}",
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
            "notifications": [
                {
                    "id": "run-recovered",
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Pipeline recovered from error: {str(e)[:160]}",
                }
            ],
        })
        try:
            send_telegram(f"Pipeline recovered from error: {str(e)[:200]}")
        except Exception:
            logging.warning("Telegram failed, skipping")
    finally:
        logging.info("Pipeline completed")


def run_pipeline_logic(mode: str = "full") -> None:
    run_pipeline(mode)


def main() -> None:
    selected_mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    run_pipeline_logic(selected_mode)


if __name__ == "__main__":
    main()
