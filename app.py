from __future__ import annotations

import asyncio
import hashlib
import json
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from content import generate_custom_script, normalize_language
from events import get_event_history, latest_event_id
from main import PIPELINE_LOCK, _cleanup_old_artifacts, run_pipeline_logic
from notify import send_telegram
from queue_manager import job_queue
from runtime import get_runtime_settings, save_runtime_settings
from settings import BASE_DIR, OUTPUT_DIR, settings
from utils import get_logger, load_json, setup_logging


setup_logging(BASE_DIR / "logs.txt")
logger = get_logger(__name__)
app = FastAPI(title="AI Sports Automation Dashboard")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DIST_DIR = BASE_DIR / "frontend" / "build"
DIST_INDEX = DIST_DIR / "index.html"
DIST_ASSETS_DIR = DIST_DIR / "static"
LOG_FILE = BASE_DIR / "logs.txt"
STATUS_FILE = OUTPUT_DIR / "pipeline_status.json"
LATEST_RUN_FILE = OUTPUT_DIR / "latest_run.json"
SCHEDULER_STARTED = False
_RATE_WINDOW_SECONDS = 60
_RATE_LIMIT_PER_WINDOW = 120
_REQUEST_HISTORY: dict[str, deque[float]] = defaultdict(deque)


class AutomationRunRequest(BaseModel):
    language: str | None = None
    mode: str | None = "full"
    prompt: str = ""


class PromptRequest(BaseModel):
    topic: str = ""
    language: str | None = None
    mode: str = "full"


class TelegramTestRequest(BaseModel):
    message: str = "Telegram test from AI YouTube Automation"


class RuntimeSettingsUpdateRequest(BaseModel):
    default_language: str | None = None
    default_mode: str | None = None
    enable_shorts: bool | None = None
    enable_long_video: bool | None = None
    enable_upload: bool | None = None
    enable_notifications: bool | None = None
    tts_provider: str | None = None
    preferred_news_sources: list[str] | None = None
    preferred_visual_sources: list[str] | None = None
    short_video_duration: int | None = Field(default=None, ge=20, le=180)
    long_video_duration: int | None = Field(default=None, ge=60, le=1200)
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    prompt_seed: str | None = None
    prompt_style: str | None = None
    auto_mode_label: str | None = None


def _read_json(path: Path, default: Any = None) -> Any:
    return load_json(path, default=default)


def _latest_run_payload() -> dict[str, Any]:
    return _read_json(LATEST_RUN_FILE, default={}) or {}


def _latest_work_dir() -> Path | None:
    latest_run = _latest_run_payload()
    work_dir = latest_run.get("work_dir")
    if work_dir:
        candidate = Path(str(work_dir))
        if candidate.exists():
            return candidate
    directories = [item for item in OUTPUT_DIR.iterdir() if item.is_dir()]
    return max(directories, key=lambda item: item.stat().st_mtime) if directories else None


def _latest_content_payload() -> dict[str, Any]:
    work_dir = _latest_work_dir()
    if not work_dir:
        return {}
    return _read_json(work_dir / "content.json", default={}) or {}


def _as_mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _topic_value(value: Any, key: str, default: Any = "") -> Any:
    return value.get(key, default) if isinstance(value, dict) else default


def _to_output_url(file_path: str | None) -> str:
    if not file_path:
        return ""
    if str(file_path).startswith(("http://", "https://")):
        return str(file_path)
    candidate = Path(str(file_path))
    if not candidate.exists():
        return ""
    try:
        relative_path = candidate.resolve().relative_to(OUTPUT_DIR.resolve())
    except Exception:
        return ""
    return f"/output/{str(relative_path).replace(chr(92), '/')}"


def _read_log_text() -> str:
    try:
        return LOG_FILE.read_text(encoding="utf-8")
    except Exception:
        return ""


def _load_logs() -> list[dict[str, str]]:
    status = _read_json(STATUS_FILE, default={}) or {}
    if status.get("live_logs"):
        return status["live_logs"][-150:]
    items: list[dict[str, str]] = []
    for index, raw_line in enumerate(_read_log_text().splitlines()):
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split(" - ", 2)
        timestamp, level, message = (parts if len(parts) == 3 else ("", "INFO", line))
        items.append({"id": f"log-{index}", "timestamp": timestamp, "level": level.lower(), "message": message})
    return items[-150:]


def _load_status() -> dict[str, Any]:
    runtime = get_runtime_settings()
    status = _read_json(STATUS_FILE, default={}) or {}
    latest_run = _latest_run_payload()
    latest_content = _latest_content_payload()
    content = _as_mapping(latest_content.get("content", {}))
    selected_topic = latest_content.get("selected_topic") or latest_run.get("selected_topic") or {}

    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")
    status.setdefault("language", latest_run.get("language", runtime.default_language))
    status.setdefault("language_label", "Telugu" if status["language"] == "te" else "English")
    status.setdefault("mode", latest_run.get("mode", runtime.default_mode))
    status.setdefault("notifications", [])
    status["thumbnail_url"] = _to_output_url(status.get("thumbnail_url")) or _to_output_url(latest_run.get("thumbnail_url")) or _to_output_url(latest_run.get("thumbnail"))
    status.setdefault("thumbnail_text", content.get("thumbnail_text", ""))

    preview_items: list[dict[str, str]] = []
    if latest_run.get("shorts_video_url") or latest_run.get("shorts_video"):
        preview_items.append({"label": "Shorts Preview", "url": _to_output_url(latest_run.get("shorts_video_url") or latest_run.get("shorts_video")), "variant": "short"})
    if latest_run.get("long_video_url") or latest_run.get("long_video"):
        preview_items.append({"label": "Long Video Preview", "url": _to_output_url(latest_run.get("long_video_url") or latest_run.get("long_video")), "variant": "long"})
    status["preview_items"] = [item for item in preview_items if item.get("url")]

    links: list[dict[str, str]] = []
    if str(latest_run.get("shorts_upload", "")).startswith("https://"):
        links.append({"label": "Shorts", "url": latest_run["shorts_upload"]})
    if str(latest_run.get("long_upload", "")).startswith("https://"):
        links.append({"label": "Long Video", "url": latest_run["long_upload"]})
    status["youtube_links"] = links

    status.setdefault("selected_topic", _topic_value(selected_topic, "title", latest_run.get("title", "")))
    status.setdefault("selected_topic_summary", _topic_value(selected_topic, "summary", ""))
    status["runtime"] = runtime.to_public_dict()
    status["queue"] = job_queue.snapshot()
    return status


def _validate_request(request: Request) -> None:
    configured_api_key = settings.openai_api_key[:0]
    configured_api_key = getattr(settings, "api_key", "") if hasattr(settings, "api_key") else configured_api_key
    required_api_key = str(configured_api_key or "").strip()
    if required_api_key and request.headers.get("x-api-key", "").strip() != required_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    client_id = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = _REQUEST_HISTORY[client_id]
    while bucket and now - bucket[0] > _RATE_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= _RATE_LIMIT_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    bucket.append(now)


def _build_news_payload() -> dict[str, Any]:
    latest_content = _latest_content_payload()
    selected_topic = latest_content.get("selected_topic") or {}
    highlights = latest_content.get("highlights", []) or []
    items = []
    for index, item in enumerate(highlights[:10]):
        payload = _as_mapping(item)
        items.append(
            {
                "id": payload.get("title", f"headline-{index}"),
                "title": payload.get("title", "Headline unavailable"),
                "summary": payload.get("summary", "No summary available."),
                "source": payload.get("source", "system"),
                "image": payload.get("image") or payload.get("image_url") or payload.get("thumbnail") or "",
                "trending": payload.get("is_trending", False),
                "published_at": payload.get("published_at", ""),
                "topic": payload.get("topic", payload.get("category", "sports")),
                "category": payload.get("category", "Sports"),
            }
        )
    if not items and selected_topic:
        items.append(
            {
                "id": _topic_value(selected_topic, "title", "headline-0"),
                "title": _topic_value(selected_topic, "title", "Headline unavailable"),
                "summary": _topic_value(selected_topic, "summary", "No summary available."),
                "source": _topic_value(selected_topic, "source", "system"),
                "image": _topic_value(selected_topic, "image") or _topic_value(selected_topic, "image_url") or "",
                "trending": _topic_value(selected_topic, "is_trending", False),
                "published_at": _topic_value(selected_topic, "published_at", ""),
                "topic": _topic_value(selected_topic, "topic", "sports"),
                "category": _topic_value(selected_topic, "category", "Sports"),
            }
        )
    return {"items": items}


def _build_prompt(topic: str, *, language: str, mode: str) -> dict[str, str]:
    runtime = get_runtime_settings()
    clean_topic = (topic or _load_status().get("selected_topic") or "Latest cricket breaking news").strip()
    clean_mode = (mode or runtime.default_mode or "full").strip().lower()
    duration = runtime.short_video_duration if clean_mode == "short" else runtime.long_video_duration
    language_label = "Telugu" if language == "te" else "English"
    structure = "Hook -> Fast Context -> 3 Key Highlights -> Punchy Conclusion + CTA" if clean_mode == "short" else "Hook -> Context -> Detailed Highlights -> Analysis -> Conclusion + CTA"
    prompt = "\n".join(
        [
            f"Create a {language_label} YouTube {'Short' if clean_mode == 'short' else 'long-form video'} script about '{clean_topic}'.",
            f"Target duration: about {duration} seconds.",
            f"Tone: {runtime.prompt_style} sports-news delivery.",
            f"Structure: {structure}.",
            "Include:",
            "1. A strong attention-grabbing opening hook.",
            "2. Clear context so the viewer understands why the story matters.",
            "3. Key highlights broken into clean, high-retention points.",
            "4. A conclusion that summarizes the takeaway and adds a subscribe/follow CTA.",
            "5. Scene-by-scene visual cues and a thumbnail text idea.",
            f"Extra guidance: {runtime.prompt_seed or 'Focus on cricket-first storytelling with crisp updates.'}",
        ]
    )
    return {"topic": clean_topic, "mode": clean_mode, "language": language, "prompt": prompt}


def _dashboard_payload() -> dict[str, Any]:
    return {
        "status": _load_status(),
        "news": _build_news_payload(),
        "logs": {"items": _load_logs()},
        "runtime": get_runtime_settings().to_public_dict(),
        "events": get_event_history(),
    }


def _launch_pipeline(mode: str, language: str, prompt: str = "") -> dict[str, str]:
    job = job_queue.enqueue(mode=mode, language=language, prompt=prompt)
    return {"status": "queued", "mode": mode, "language": language, "job_id": job["id"]}


def _scheduler_loop() -> None:
    while True:
        try:
            runtime = get_runtime_settings()
            if settings.enable_daily_runner:
                now = datetime.now()
                current_time = now.strftime("%H:%M")
                latest_run = _latest_run_payload()
                already_ran_today = str(latest_run.get("completed_at", "")).startswith(now.strftime("%Y-%m-%d"))
                status = _load_status()
                if current_time == settings.daily_run_time and not status.get("running") and not already_ran_today:
                    job_queue.enqueue(mode=runtime.default_mode, language=runtime.default_language, prompt="")
                    time.sleep(65)
                    continue
        except Exception as exc:
            logger.warning("Scheduler loop failed: %s", exc)
        time.sleep(20)


def _ensure_scheduler_started() -> None:
    global SCHEDULER_STARTED
    if SCHEDULER_STARTED:
        return
    SCHEDULER_STARTED = True
    threading.Thread(target=_scheduler_loop, daemon=True, name="daily-automation-scheduler").start()


@app.on_event("startup")
async def on_startup() -> None:
    _cleanup_old_artifacts()
    job_queue.start(lambda job: run_pipeline_logic(job["mode"], job["language"], job.get("prompt", "")))
    _ensure_scheduler_started()


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    _validate_request(request)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "message": "AI Sports Automation API running"})


@app.get("/config")
async def get_config() -> JSONResponse:
    runtime = get_runtime_settings()
    return JSONResponse(
        {
            "default_language": runtime.default_language,
            "daily_run_time": settings.daily_run_time,
            "daily_runner_enabled": settings.enable_daily_runner,
            "languages": runtime.to_public_dict()["language_options"],
        }
    )


@app.get("/dashboard-state")
async def dashboard_state() -> JSONResponse:
    return JSONResponse(_dashboard_payload())


@app.get("/status")
async def get_status() -> JSONResponse:
    return JSONResponse(_load_status())


@app.get("/queue")
async def get_queue() -> JSONResponse:
    return JSONResponse(job_queue.snapshot())


@app.get("/news")
async def get_news() -> JSONResponse:
    return JSONResponse(_build_news_payload())


@app.get("/logs")
async def logs() -> JSONResponse:
    return JSONResponse({"items": _load_logs()})


@app.get("/runtime-settings")
async def get_runtime_config() -> JSONResponse:
    return JSONResponse(get_runtime_settings().to_public_dict())


@app.put("/runtime-settings")
async def update_runtime_config(payload: RuntimeSettingsUpdateRequest) -> JSONResponse:
    runtime = save_runtime_settings(payload.model_dump(exclude_none=True))
    return JSONResponse(runtime.to_public_dict())


@app.post("/telegram/test")
async def telegram_test(payload: TelegramTestRequest) -> JSONResponse:
    send_telegram(payload.message)
    return JSONResponse({"status": "sent"})


@app.post("/automation/prompt")
async def generate_prompt(payload: PromptRequest) -> JSONResponse:
    language = normalize_language(payload.language or get_runtime_settings().default_language)
    return JSONResponse(_build_prompt(payload.topic, language=language, mode=payload.mode))


@app.post("/automation/start")
async def start_automation(run_request: AutomationRunRequest) -> JSONResponse:
    runtime = get_runtime_settings()
    language = normalize_language(run_request.language or runtime.default_language)
    mode = (run_request.mode or runtime.default_mode or "full").strip().lower()
    return JSONResponse(_launch_pipeline(mode, language, run_request.prompt))


@app.post("/start")
async def start_alias(run_request: AutomationRunRequest) -> JSONResponse:
    return await start_automation(run_request)


@app.post("/run")
async def post_run(run_request: AutomationRunRequest) -> JSONResponse:
    return await start_automation(run_request)


@app.post("/generate-video")
async def generate_video(run_request: AutomationRunRequest) -> JSONResponse:
    return await start_automation(run_request)


@app.post("/upload")
async def upload_latest() -> JSONResponse:
    runtime = get_runtime_settings()
    return JSONResponse(_launch_pipeline("upload_only", normalize_language(runtime.default_language)))


@app.post("/retry")
async def retry_pipeline() -> JSONResponse:
    status = _load_status()
    language = normalize_language(status.get("language"))
    return JSONResponse(_launch_pipeline(status.get("mode", "full"), language))


@app.post("/ask-ai")
async def ask_ai(payload: PromptRequest) -> JSONResponse:
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    result = generate_custom_script(topic, language=normalize_language(payload.language), include_video_prompt=True)
    return JSONResponse(result)


@app.post("/ask")
async def ask_alias(payload: PromptRequest) -> JSONResponse:
    return await ask_ai(payload)


@app.post("/render-thumbnail")
async def render_thumbnail_endpoint(payload: PromptRequest) -> JSONResponse:
    prompt = _build_prompt(payload.topic, language=normalize_language(payload.language), mode=payload.mode)
    return JSONResponse({"status": "ready", "thumbnail_text": prompt["topic"][:48], "prompt": prompt["prompt"]})


@app.get("/events")
async def events(last_event_id: str | None = Header(default=None, alias="Last-Event-ID")) -> StreamingResponse:
    async def event_stream():
        history = get_event_history(last_event_id)
        for item in history:
            yield f"id: {item['id']}\nevent: {item['type']}\ndata: {json.dumps(item, default=str)}\n\n"

        previous_hash = ""
        while True:
            payload = _dashboard_payload()
            encoded = json.dumps(payload, default=str, sort_keys=True)
            current_hash = hashlib.md5(encoded.encode("utf-8")).hexdigest()
            if current_hash != previous_hash:
                previous_hash = current_hash
                event_id = latest_event_id()
                yield f"id: {event_id}\nevent: snapshot\ndata: {encoded}\nretry: 2000\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")
if DIST_ASSETS_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(DIST_ASSETS_DIR)), name="frontend-static")


def _frontend_build_missing() -> HTTPException:
    return HTTPException(status_code=503, detail=f"React frontend build is missing. Expected file: {DIST_INDEX}")


def _serve_frontend() -> FileResponse:
    if not DIST_INDEX.exists():
        raise _frontend_build_missing()
    return FileResponse(DIST_INDEX)


@app.get("/")
async def root() -> FileResponse:
    return _serve_frontend()


@app.get("/dashboard")
async def dashboard() -> FileResponse:
    return _serve_frontend()


@app.get("/{full_path:path}")
async def frontend_routes(full_path: str) -> FileResponse:
    if full_path.startswith(
        (
            "health",
            "config",
            "status",
            "news",
            "logs",
            "run",
            "retry",
            "upload",
            "automation",
            "ask-ai",
            "runtime-settings",
            "telegram",
            "queue",
            "events",
            "dashboard-state",
            "output",
            "static",
        )
    ):
        raise HTTPException(status_code=404, detail="Not found")
    if not DIST_INDEX.exists():
        raise _frontend_build_missing()
    candidate = DIST_DIR / full_path
    if full_path and candidate.exists() and candidate.is_file():
        return FileResponse(candidate)
    return _serve_frontend()
