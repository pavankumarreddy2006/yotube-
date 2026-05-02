from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from content import ContentPackage, generate_content
from data import TopicCandidate, fallback_story_for_date, fetch_all_candidates
from notify import send_telegram
from scoring import ScoredTopic, choose_best_topic
from settings import OUTPUT_DIR, settings
from thumbnail_generator import create_thumbnail
from upload import upload_video
from utils import dump_json, get_logger, setup_logging, slugify
from video import build_video
from voice import synthesize_voice

logger = get_logger(__name__)


@dataclass
class PipelineResult:
    selected_topic: TopicCandidate
    scored_topic: ScoredTopic
    content: ContentPackage
    shorts_video: str = ""
    long_video: str = ""
    thumbnail: str = ""
    shorts_upload_url: str = ""
    long_upload_url: str = ""


def run_pipeline(mode: str = "full"):
    """Fixed main pipeline for Render"""
    setup_logging(OUTPUT_DIR / "pipeline.log")
    
    logger.info("=" * 70)
    logger.info("🚀 TELUGU SPORTS AUTOMATION STARTED | Mode: %s", mode)
    logger.info("Time: %s", datetime.now().isoformat())
    logger.info("=" * 70)

    try:
        # Fetch data
        logger.info("Fetching candidates...")
        candidates, trends = fetch_all_candidates()

        scored = choose_best_topic(candidates)
        if scored.decision == "SKIP":
            logger.info("Using fallback story")
            scored = choose_best_topic([fallback_story_for_date()])

        content = generate_content(scored.candidate, scored, trends)

        # Create work dir
        work_dir = OUTPUT_DIR / f"{datetime.now():%Y%m%d_%H%M%S}_{slugify(scored.candidate.title)}"
        work_dir.mkdir(parents=True, exist_ok=True)

        # Thumbnail
        logger.info("Creating thumbnail...")
        thumbnail_path = create_thumbnail(content.thumbnail_text, settings.thumbnail_font_path, work_dir / "thumbnail.jpg")

        # Voice + Video
        shorts_video = long_video = ""
        if settings.enable_voice:
            logger.info("Generating shorts voice...")
            shorts_audio = synthesize_voice(f"{content.hook} {content.shorts_script}", work_dir / "shorts.mp3")
            if shorts_audio:
                logger.info("Building shorts video...")
                shorts_video = build_video(
                    audio_path=shorts_audio,
                    output_path=work_dir / "shorts.mp4",
                    background_path=settings.background_video_vertical,
                    vertical=True
                )

        # Upload (if enabled)
        if settings.enable_upload and shorts_video and thumbnail_path:
            logger.info("Uploading to YouTube...")
            upload_video(
                video_path=shorts_video,
                title=content.title,
                description=content.description,
                tags=content.tags,
                thumbnail_path=thumbnail_path
            )

        logger.info("🎉 PIPELINE COMPLETED SUCCESSFULLY!")
        send_telegram("✅ Automation Completed Successfully!")

    except Exception as e:
        logger.exception("Pipeline failed")
        send_telegram(f"❌ Pipeline Error: {str(e)[:200]}")
        raise


if __name__ == "__main__":
    run_pipeline()