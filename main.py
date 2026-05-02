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

# Main pipeline for the Telugu sports automation system.
# This script selects the best sports topic, generates Telugu voice,
# builds a video from a background clip, uploads to YouTube, creates
# a thumbnail, and sends a Telegram notification.


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
    setup_logging(OUTPUT_DIR / "pipeline.log")
    logger.info("Pipeline started, mode=%s", mode)
    _write_status(current_task="startup", status="Running", failed=False)
    send_telegram("Daily Telugu sports automation started.")

    if mode == "upload_only":
        result = _retry_upload()
        _write_status(current_task="upload only", status="Completed", failed=False, result=result)
        return result

    # Collect candidate stories from news, cricket updates, and trends.
    candidates, trends = fetch_all_candidates()
    dump_json(OUTPUT_DIR / "latest_candidates.json", [asdict(candidate) for candidate in candidates])
    scored = choose_best_topic(candidates)

    # If the top score is too low, use a fallback story so the channel still publishes daily.
    if scored.decision == "SKIP":
        logger.info("Top score below threshold. Switching to fallback story so the channel never goes empty.")
        scored = choose_best_topic([fallback_story_for_date()])

    # Generate Telugu content for the selected topic.
    content = generate_content(scored.candidate, scored, trends)

    # Create a timestamped working folder for this run's outputs.
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = slugify(scored.candidate.title)
    work_dir = OUTPUT_DIR / f"{timestamp}_{slug}"
    work_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Selected topic: %s | score=%s | decision=%s", scored.candidate.title, scored.score, scored.decision)
    _write_status(current_task="thumbnail generation")
    thumbnail_path = _attempt(
        "thumbnail generation",
        lambda: create_thumbnail(content.thumbnail_text, settings.thumbnail_font_path, work_dir / "thumbnail.jpg"),
        fallback_value="",
    )

    shorts_audio = ""
    if settings.enable_voice:
        _write_status(current_task="shorts voice generation")
        shorts_audio = _attempt(
            "shorts voice generation",
            lambda: synthesize_voice(f"{content.hook} {content.shorts_script}", work_dir / "shorts.mp3"),
            fallback_value="",
        )
    else:
        logger.info("Voice generation disabled by settings.")

    shorts_video = ""
    if shorts_audio:
        _write_status(current_task="shorts video build")
        shorts_video = _attempt(
            "shorts video build",
            lambda: build_video(
                audio_path=shorts_audio,
                output_path=work_dir / "shorts.mp4",
                background_path=settings.background_video_vertical,
                vertical=True,
            ),
            fallback_value="",
        )

    long_video = ""
    if scored.decision == "FULL" and settings.enable_long_video and content.long_script.strip():
        if settings.enable_voice:
            _write_status(current_task="long voice generation")
            long_audio = _attempt(
                "long voice generation",
                lambda: synthesize_voice(content.long_script, work_dir / "long.mp3"),
                fallback_value="",
            )
            if long_audio:
                _write_status(current_task="long video build")
                long_video = _attempt(
                    "long video build",
                    lambda: build_video(
                        audio_path=long_audio,
                        output_path=work_dir / "long.mp4",
                        background_path=settings.background_video_horizontal,
                        vertical=False,
                    ),
                    fallback_value="",
                )
        else:
            logger.info("Voice generation disabled, skipping long video.")

    shorts_upload_url = ""
    if shorts_video and thumbnail_path:
        _write_status(current_task="shorts upload")
        shorts_upload_url = _attempt(
            "shorts upload",
            lambda: upload_video(
                video_path=shorts_video,
                title=f"{content.title} #Shorts",
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags,
                thumbnail_path=thumbnail_path,
            ),
            fallback_value="",
        )

    long_upload_url = ""
    if long_video and thumbnail_path:
        _write_status(current_task="long upload")
        long_upload_url = _attempt(
            "long upload",
            lambda: upload_video(
                video_path=long_video,
                title=content.title,
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags,
                thumbnail_path=thumbnail_path,
            ),
            fallback_value="",
        )

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
    _write_status(
        current_task="completed",
        status="Completed",
        failed=False,
        result=result,
    )
    send_telegram(
        "Automation success.\n"
        f"Topic: {scored.candidate.title}\n"
        f"Decision: {scored.decision} ({scored.score})\n"
        f"Shorts: {shorts_upload_url or 'generated locally'}\n"
        f"Long: {long_upload_url or 'not generated'}"
    )
    return result


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


def _load_latest_run() -> dict | None:
    latest_path = OUTPUT_DIR / "latest_run.json"
    if latest_path.exists():
        return load_json(latest_path, default=None)

    latest_dir = _find_latest_run_dir()
    if latest_dir is None:
        return None

    run_file = latest_dir / "run.json"
    return load_json(run_file, default=None)


def _find_latest_run_dir() -> Path | None:
    run_dirs = sorted(
        [entry for entry in OUTPUT_DIR.iterdir() if entry.is_dir()],
        key=lambda path: path.name,
    )
    return run_dirs[-1] if run_dirs else None


def _write_status(
    current_task: str,
    status: str = "Running",
    failed: bool = False,
    result: PipelineResult | None = None,
) -> None:
    payload = {
        "running": status == "Running" and not failed,
        "failed": failed,
        "status": status,
        "current_task": current_task,
        "last_run_time": datetime.now().isoformat(),
        "notifications": [],
        "thumbnail_url": "",
        "thumbnail_text": "",
        "selected_topic": "",
        "decision_score": 0,
        "decision": "",
    }

    if result is not None:
        payload.update(
            {
                "thumbnail_url": Path(result.thumbnail).name if result.thumbnail else "",
                "thumbnail_text": result.content.thumbnail_text,
                "selected_topic": result.selected_topic.title,
                "decision_score": result.scored_topic.score,
                "decision": result.scored_topic.decision,
            }
        )

    if payload["thumbnail_url"]:
        payload["thumbnail_url"] = f"/output/{payload['thumbnail_url']}"

    dump_json(OUTPUT_DIR / "pipeline_status.json", payload)


def _retry_upload() -> PipelineResult:
    latest = _load_latest_run()
    if not latest:
        raise RuntimeError("No previous run found for upload retry.")

    selected_topic = TopicCandidate(**latest["selected_topic"])
    scored_topic = ScoredTopic(
        candidate=selected_topic,
        score=latest["scored_topic"]["score"],
        decision=latest["scored_topic"]["decision"],
        reasons=latest["scored_topic"].get("reasons", []),
    )
    content = ContentPackage(**latest["content"])
    thumbnail_path = latest.get("thumbnail", "")
    shorts_video = latest.get("shorts_video", "")
    long_video = latest.get("long_video", "")

    shorts_upload_url = ""
    if shorts_video and thumbnail_path:
        _write_status(current_task="retry shorts upload")
        shorts_upload_url = _attempt(
            "retry shorts upload",
            lambda: upload_video(
                video_path=shorts_video,
                title=f"{content.title} #Shorts",
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags,
                thumbnail_path=thumbnail_path,
            ),
            fallback_value="",
        )

    long_upload_url = ""
    if long_video and thumbnail_path:
        _write_status(current_task="retry long upload")
        long_upload_url = _attempt(
            "retry long upload",
            lambda: upload_video(
                video_path=long_video,
                title=content.title,
                description=f"{content.description}\n\n{' '.join(content.hashtags)}",
                tags=content.tags,
                thumbnail_path=thumbnail_path,
            ),
            fallback_value="",
        )

    result = PipelineResult(
        selected_topic=selected_topic,
        scored_topic=scored_topic,
        content=content,
        shorts_video=shorts_video,
        long_video=long_video,
        thumbnail=thumbnail_path,
        shorts_upload_url=shorts_upload_url,
        long_upload_url=long_upload_url,
    )
    dump_json(OUTPUT_DIR / "latest_run.json", _serialize_result(result))
    return result


def _attempt(step_name: str, operation, fallback_value):
    try:
        return operation()
    except Exception as exc:  # noqa: BLE001
        logger.exception("%s failed: %s", step_name, exc)
        send_telegram(f"{step_name} failed.\nTrying to continue.\nError: {exc}")
        return fallback_value


if __name__ == "__main__":
    try:
        run_pipeline()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed: %s", exc)
        send_telegram(f"Automation failed.\nError: {exc}")
        raise
