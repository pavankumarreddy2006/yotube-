from __future__ import annotations

import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from content import generate_custom_script, normalize_language
from main import run_pipeline_logic
from settings import BASE_DIR, OUTPUT_DIR, settings
from utils import get_logger, load_json, setup_logging


setup_logging(BASE_DIR / "logs.txt")
logger = get_logger(__name__)
app = FastAPI(title="AI Sports Automation Dashboard")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DIST_DIR = BASE_DIR / "frontend" / "dist"
LOG_FILE = BASE_DIR / "logs.txt"
STATUS_FILE = OUTPUT_DIR / "pipeline_status.json"
LATEST_RUN_FILE = OUTPUT_DIR / "latest_run.json"
SCHEDULER_STARTED = False


class AutomationRunRequest(BaseModel):
    language: str | None = None
    mode: str | None = "full"


class AskAIRequest(BaseModel):
    topic: str
    language: str | None = None
    generate_video: bool = False


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
    if not directories:
        return None
    return max(directories, key=lambda item: item.stat().st_mtime)


def _latest_content_payload() -> dict[str, Any]:
    work_dir = _latest_work_dir()
    if not work_dir:
        return {}
    return _read_json(work_dir / "content.json", default={}) or {}


def _to_output_url(file_path: str | None) -> str:
    if not file_path:
        return ""
    try:
        relative_path = Path(str(file_path)).resolve().relative_to(OUTPUT_DIR.resolve())
    except Exception:
        return ""
    web_path = str(relative_path).replace("\\", "/")
    return f"/output/{web_path}"


def _read_log_text() -> str:
    try:
        return LOG_FILE.read_text(encoding="utf-8")
    except Exception:
        return ""


def _load_logs() -> list[dict[str, str]]:
    status = _read_json(STATUS_FILE, default={}) or {}
    if status.get("live_logs"):
        return status["live_logs"]

    items: list[dict[str, str]] = []
    for index, raw_line in enumerate(_read_log_text().splitlines()):
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split(" - ", 2)
        if len(parts) == 3:
            timestamp, level, message = parts
        else:
            timestamp, level, message = "", "INFO", line
        items.append(
            {
                "id": f"log-{index}",
                "timestamp": timestamp,
                "level": level.lower(),
                "message": message,
            }
        )
    return items[-120:]


def _load_status() -> dict[str, Any]:
    status = _read_json(STATUS_FILE, default={}) or {}
    latest_run = _latest_run_payload()
    latest_content = _latest_content_payload()
    content = latest_content.get("content", {})
    selected_topic = latest_content.get("selected_topic", {})

    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")
    status.setdefault("language", latest_run.get("language", settings.default_language))
    status.setdefault("language_label", "Telugu" if status["language"] == "te" else "English")
    status["thumbnail_url"] = _to_output_url(status.get("thumbnail_url")) or _to_output_url(latest_run.get("thumbnail"))
    status.setdefault("thumbnail_text", content.get("thumbnail_text", ""))
    status.setdefault("notifications", [])
    if not status.get("preview_items"):
        preview_items: list[dict[str, str]] = []
        if latest_run.get("shorts_video"):
            preview_items.append({"label": "Shorts Preview", "url": _to_output_url(latest_run.get("shorts_video")), "variant": "short"})
        if latest_run.get("long_video"):
            preview_items.append({"label": "Long Video Preview", "url": _to_output_url(latest_run.get("long_video")), "variant": "long"})
        status["preview_items"] = [item for item in preview_items if item.get("url")]
    if not status.get("youtube_links"):
        youtube_links: list[dict[str, str]] = []
        if str(latest_run.get("shorts_upload", "")).startswith("https://"):
            youtube_links.append({"label": "Shorts", "url": latest_run["shorts_upload"]})
        if str(latest_run.get("long_upload", "")).startswith("https://"):
            youtube_links.append({"label": "Long Video", "url": latest_run["long_upload"]})
        status["youtube_links"] = youtube_links
    status.setdefault("selected_topic", selected_topic.get("title", latest_run.get("title", "")))
    status.setdefault("selected_topic_summary", selected_topic.get("summary", ""))
    return status


def _build_news_payload() -> dict[str, Any]:
    latest_content = _latest_content_payload()
    selected_topic = latest_content.get("selected_topic", {})
    highlights = latest_content.get("highlights", []) or []
    items = []

    for index, item in enumerate(highlights[:10]):
        payload = item if isinstance(item, dict) else {}
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
                "id": selected_topic.get("title", "headline-0"),
                "title": selected_topic.get("title", "Headline unavailable"),
                "summary": selected_topic.get("summary", "No summary available."),
                "source": selected_topic.get("source", "system"),
                "image": selected_topic.get("image") or selected_topic.get("image_url") or selected_topic.get("thumbnail") or "",
                "trending": selected_topic.get("is_trending", False),
                "published_at": selected_topic.get("published_at", ""),
                "topic": selected_topic.get("topic", selected_topic.get("category", "sports")),
                "category": selected_topic.get("category", "Sports"),
            }
        )
    return {"items": items}


def _launch_pipeline(mode: str, language: str) -> dict[str, str]:
    status = _load_status()
    if status.get("running"):
        raise HTTPException(status_code=409, detail="Automation is already running")
    worker = threading.Thread(
        target=run_pipeline_logic,
        kwargs={"mode": mode, "language": language},
        daemon=True,
        name=f"pipeline-{mode}-{language}",
    )
    worker.start()
    return {"status": "pipeline started", "mode": mode, "language": language}


def _scheduler_loop() -> None:
    while True:
        try:
            if settings.enable_daily_runner:
                now = datetime.now()
                current_time = now.strftime("%H:%M")
                latest_run = _latest_run_payload()
                already_ran_today = str(latest_run.get("completed_at", "")).startswith(now.strftime("%Y-%m-%d"))
                status = _load_status()
                if current_time == settings.daily_run_time and not status.get("running") and not already_ran_today:
                    logger.info("Starting scheduled automation run for %s", settings.daily_run_time)
                    worker = threading.Thread(
                        target=run_pipeline_logic,
                        kwargs={"mode": "full", "language": settings.default_language},
                        daemon=True,
                        name="scheduled-pipeline-runner",
                    )
                    worker.start()
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
    worker = threading.Thread(target=_scheduler_loop, daemon=True, name="daily-automation-scheduler")
    worker.start()


def _fallback_dashboard_html() -> str:
    return """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Sports Automation Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; background: #09111d; color: white; padding: 24px; }
      .card { background: #101b2a; border: 1px solid #223349; border-radius: 18px; padding: 20px; max-width: 860px; margin: 0 auto; }
      button, select { padding: 12px 16px; border-radius: 999px; border: 0; margin-right: 8px; }
      button { background: #11d1b2; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>AI Sports Automation Dashboard</h1>
      <p>The React build is missing, so this fallback page can still trigger the automation pipeline.</p>
      <select id="lang">
        <option value="te">Telugu</option>
        <option value="en">English</option>
      </select>
      <button onclick="startRun()">START AUTOMATION</button>
      <pre id="result"></pre>
    </div>
    <script>
      async function startRun() {
        const language = document.getElementById('lang').value;
        const response = await fetch('/automation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, mode: 'full' })
        });
        document.getElementById('result').textContent = await response.text();
      }
    </script>
  </body>
</html>
"""


@app.on_event("startup")
async def on_startup() -> None:
    _ensure_scheduler_started()


@app.get("/")
async def root():
    if DIST_DIR.exists():
        return FileResponse(DIST_DIR / "index.html")
    return HTMLResponse(_fallback_dashboard_html())


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "message": "AI Sports Automation API running"})


@app.get("/config")
async def get_config() -> JSONResponse:
    return JSONResponse(
        {
            "default_language": normalize_language(settings.default_language),
            "daily_run_time": settings.daily_run_time,
            "daily_runner_enabled": settings.enable_daily_runner,
            "languages": [
                {"value": "te", "label": "Telugu"},
                {"value": "en", "label": "English"},
            ],
        }
    )


@app.get("/status")
async def get_status() -> JSONResponse:
    return JSONResponse(_load_status())


@app.get("/news")
async def get_news() -> JSONResponse:
    return JSONResponse(_build_news_payload())


@app.get("/decision")
async def get_decision() -> JSONResponse:
    latest_content = _latest_content_payload()
    scored_topic = latest_content.get("scored_topic", {})
    selected_topic = latest_content.get("selected_topic", {})
    return JSONResponse(
        {
            "score": scored_topic.get("score", 0),
            "action": scored_topic.get("decision", "HOLD"),
            "reasons": scored_topic.get("reasons", []),
            "selected_topic": selected_topic.get("title", "No topic selected"),
        }
    )


@app.get("/content")
async def get_content() -> JSONResponse:
    latest_content = _latest_content_payload()
    content = latest_content.get("content", {}) or {}
    payload = dict(content)
    payload["preview_items"] = _load_status().get("preview_items", [])
    return JSONResponse(payload)


@app.get("/logs")
async def logs() -> JSONResponse:
    return JSONResponse({"items": _load_logs()})


@app.post("/automation/start")
async def start_automation(run_request: AutomationRunRequest) -> JSONResponse:
    language = normalize_language(run_request.language)
    mode = run_request.mode or "full"
    return JSONResponse(_launch_pipeline(mode, language))


@app.post("/start")
async def start_alias(run_request: AutomationRunRequest) -> JSONResponse:
    language = normalize_language(run_request.language)
    mode = run_request.mode or "full"
    return JSONResponse(_launch_pipeline(mode, language))


@app.post("/run")
async def post_run(run_request: AutomationRunRequest) -> JSONResponse:
    language = normalize_language(run_request.language)
    mode = run_request.mode or "full"
    return JSONResponse(_launch_pipeline(mode, language))


@app.post("/upload")
async def upload_latest() -> JSONResponse:
    return JSONResponse(_launch_pipeline("upload_only", normalize_language(settings.default_language)))


@app.post("/retry")
async def retry_pipeline() -> JSONResponse:
    status = _load_status()
    language = normalize_language(status.get("language"))
    return JSONResponse(_launch_pipeline("full", language))


@app.post("/ask-ai")
async def ask_ai(payload: AskAIRequest) -> JSONResponse:
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    result = generate_custom_script(
        topic,
        language=normalize_language(payload.language),
        include_video_prompt=payload.generate_video,
    )
    return JSONResponse(result)


@app.post("/ask")
async def ask_alias(payload: AskAIRequest) -> JSONResponse:
    return await ask_ai(payload)


app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="frontend-assets")

    def _serve_frontend() -> FileResponse:
        return FileResponse(DIST_DIR / "index.html")

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
                "decision",
                "content",
                "run",
                "retry",
                "upload",
                "logs",
                "automation",
                "ask-ai",
                "output",
                "assets",
            )
        ):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = DIST_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return _serve_frontend()
else:
    @app.get("/dashboard")
    async def dashboard() -> HTMLResponse:
        return HTMLResponse(_fallback_dashboard_html())
