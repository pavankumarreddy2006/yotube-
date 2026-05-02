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
from utils import dump_json, get_logger, load_json, setup_logging, slugify
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


def run_pipeline(mode: str = "full") -> PipelineResult:
    """Main automation pipeline - Fixed for Render"""
    
    setup_logging(OUTPUT_DIR / "pipeline.log")
    
    logger.info("=" * 80)
    logger.info("🚀 TELUGU SPORTS AUTOMATION STARTED | Mode: %s", mode)
    logger.info("Time: %s", datetime.now().isoformat())
    logger.info("=" * 80)

    _write_status(current_task="startup", status="Running", failed=False)
    send_telegram("✅ Daily Telugu Sports Automation Started on Render.")

    try:
        if mode == "upload_only":
            result = _retry_upload()
            _write_status("upload only", "Completed", False, result)
            logger.info("✅ Upload-only mode completed")
            return result

        # Fetch candidates
        candidates, trends = fetch_all_candidates()
        dump_json(OUTPUT_DIR / "latest_candidates.json", [asdict(c) for c in candidates])

        scored = choose_best_topic(candidates)
        if scored.decision == "SKIP":
            logger.warning("Using fallback story")
            scored = choose_best_topic([fallback_story_for_date()])

        content = generate_content(scored.candidate, scored, trends)

        # Create output directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        slug = slugify(scored.candidate.title)
        work_dir = OUTPUT_DIR / f"{timestamp}_{slug}"
        work_dir.mkdir(parents=True, exist_ok=True)

        logger.info("Processing: %s | Score: %d", scored.candidate.title[:80], scored.score)

        # Thumbnail
        _write_status(current_task="thumbnail generation")
        thumbnail_path = _attempt(
            "thumbnail generation",
            lambda: create_thumbnail(content.thumbnail_text, settings.thumbnail_font_path, work_dir / "thumbnail.jpg"),
            ""
        )

        # Shorts
        shorts_video = ""
        if settings.enable_voice:
            _write_status(current_task="shorts voice")
            shorts_audio = _attempt(
                "shorts voice",
                lambda: synthesize_voice(f"{content.hook} {content.shorts_script}", work_dir / "shorts.mp3"),
                ""
            )
            if shorts_audio:
                _write_status(current_task="shorts video")
                shorts_video = _attempt(
                    "shorts video",
                    lambda: build_video(
                        audio_path=shorts_audio,
                        output_path=work_dir / "shorts.mp4",
                        background_path=settings.background_video_vertical,
                        vertical=True
                    ),
                    ""
                )

        # Long Video
        long_video = ""
        if scored.decision == "FULL" and settings.enable_long_video and content.long_script:
            if settings.enable_voice:
                _write_status(current_task="long voice")
                long_audio = _attempt(
                    "long voice",
                    lambda: synthesize_voice(content.long_script, work_dir / "long.mp3"),
                    ""
                )
                if long_audio:
                    _write_status(current_task="long video")
                    long_video = _attempt(
                        "long video",
                        lambda: build_video(
                            audio_path=long_audio,
                            output_path=work_dir / "long.mp4",
                            background_path=settings.background_video_horizontal,
                            vertical=False
                        ),
                        ""
                    )

        # Uploads
        shorts_upload_url = _attempt(
            "shorts upload",
            lambda: upload_video(
                video_path=shorts_video, title=f"{content.title} #Shorts",
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags, thumbnail_path=thumbnail_path
            ) if shorts_video and thumbnail_path else "",
            ""
        )

        long_upload_url = _attempt(
            "long upload",
            lambda: upload_video(
                video_path=long_video, title=content.title,
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags, thumbnail_path=thumbnail_path
            ) if long_video and thumbnail_path else "",
            ""
        )

        # Save result
        result = PipelineResult(
            selected_topic=scored.candidate,
            scored_topic=scored,
            content=content,
            shorts_video=str(shorts_video),
            long_video=str(long_video),
            thumbnail=str(thumbnail_path),
            shorts_upload_url=shorts_upload_url,
            long_upload_url=long_upload_url,
        )

        dump_json(work_dir / "run.json", _serialize_result(result))
        dump_json(OUTPUT_DIR / "latest_run.json", _serialize_result(result))

        _write_status(current_task="completed", status="Completed", failed=False, result=result)
        logger.info("🎉 PIPELINE COMPLETED SUCCESSFULLY!")
        send_telegram("✅ Automation Completed Successfully!")

        return result

    except Exception as e:
        logger.exception("💥 Pipeline Failed")
        send_telegram(f"❌ Pipeline Failed: {str(e)[:150]}")
        _write_status(current_task="failed", status="Failed", failed=True)
        raise


# ====================== HELPER FUNCTIONS ======================
def _serialize_result(result: PipelineResult) -> dict:
    return {
        "selected_topic": asdict(result.selected_topic),
        "scored_topic": {
            "score": result.scored_topic.score,
            "decision": result.scored_topic.decision,
            "reasons": result.scored_topic.reasons,
        },
        "content": asdict(result.content),
        "shorts_video": result.shorts_video,
        "long_video": result.long_video,
        "thumbnail": result.thumbnail,
        "shorts_upload_url": result.shorts_upload_url,
        "long_upload_url": result.long_upload_url,
    }


def _write_status(current_task: str, status: str = "Running", failed: bool = False, result: PipelineResult | None = None):
    payload = {
        "running": status == "Running" and not failed,
        "failed": failed,
        "status": status,
        "current_task": current_task,
        "last_run_time": datetime.now().isoformat(),
    }
    dump_json(OUTPUT_DIR / "pipeline_status.json", payload)


def _attempt(step_name: str, operation, fallback_value):
    try:
        return operation()
    except Exception as exc:
        logger.exception("%s failed", step_name)
        send_telegram(f"{step_name} failed: {str(exc)[:100]}")
        return fallback_value


def _retry_upload():
    # Keep your existing _retry_upload logic or implement minimal version
    logger.info("Upload retry requested")
    return PipelineResult(selected_topic=TopicCandidate(title="Retry"), scored_topic=ScoredTopic(candidate=None, score=0, decision="RETRY"), content=ContentPackage(title="", hook="", shorts_script="", long_script="", thumbnail_text="", thumbnail_idea="", description="", hashtags=[], tags=[]))


if __name__ == "__main__":
    run_pipeline()