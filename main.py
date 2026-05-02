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
from thumbnail_generator import create_thumbnail
from upload import upload_video
from utils import dump_json, get_logger, setup_logging, slugify
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
        hook=data["script"],
        shorts_script=data["script"],
        long_script=data["script"] if settings.enable_long_video else "",
        thumbnail_text="Telugu Sports Update",
        thumbnail_idea="Bold Telugu sports news thumbnail",
        description=data["script"],
        hashtags=["#TeluguSports", "#SportsUpdate"],
        tags=["telugu sports", "sports update"],
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
        return None
    return upload_video(
        video_path=str(video_path),
        title=content.title,
        description=content.description,
        tags=content.tags,
        thumbnail_path=str(thumbnail_path),
    )


def run_pipeline(mode: str = "full"):
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

        try:
            thumbnail_path = str(create_thumbnail(
                content.thumbnail_text or "Telugu Sports Update",
                settings.thumbnail_font_path,
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

        try:
            upload_result = upload_video_safe(video_path, content, thumbnail_path)
        except Exception as e:
            logging.error("Upload failed: %s", e)

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
            "failed": False,
            "status": "Completed",
            "current_task": "Pipeline completed",
            "last_run_time": datetime.now().isoformat(),
            "mode": mode,
            "work_dir": str(work_dir),
            "video": video_path,
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
