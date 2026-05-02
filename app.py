from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from settings import BASE_DIR, OUTPUT_DIR
from utils import get_logger, load_json, setup_logging


setup_logging(BASE_DIR / "logs.txt")
logging.basicConfig(
    filename=str(BASE_DIR / "logs.txt"),
    level=logging.INFO,
)
logger = get_logger(__name__)
app = FastAPI(title="Telugu Sports Automation Dashboard")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DIST_DIR = BASE_DIR / "frontend" / "dist"
LOG_FILE = BASE_DIR / "logs.txt"
LEGACY_LOG_FILE = OUTPUT_DIR / "pipeline.log"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class RunRequest(BaseModel):
    mode: str | None = "full"


def _read_json(path: Path, default: Any = None) -> Any:
    return load_json(path, default=default)


def _latest_run_payload() -> dict[str, Any]:
    return _read_json(OUTPUT_DIR / "latest_run.json", default={}) or {}


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


def _read_log_text() -> str:
    try:
        return LOG_FILE.read_text(encoding="utf-8")
    except Exception:
        try:
            return LEGACY_LOG_FILE.read_text(encoding="utf-8")
        except Exception:
            return ""


def _load_logs() -> list[dict[str, str]]:
    log_text = _read_log_text()
    if not log_text.strip():
        return []

    items: list[dict[str, str]] = []
    for index, raw_line in enumerate(log_text.splitlines()):
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

    return items


def _to_output_url(file_path: str | None) -> str:
    if not file_path:
        return ""

    try:
        relative_path = Path(str(file_path)).resolve().relative_to(OUTPUT_DIR.resolve())
    except Exception:
        return ""

    web_path = str(relative_path).replace("\\", "/")
    return f"/output/{web_path}"


def _load_status() -> dict[str, Any]:
    status = _read_json(OUTPUT_DIR / "pipeline_status.json", default={}) or {}
    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")

    latest_run = _latest_run_payload()
    latest_content = _latest_content_payload()
    status["thumbnail_url"] = _to_output_url(status.get("thumbnail_url")) or _to_output_url(latest_run.get("thumbnail"))
    status.setdefault("thumbnail_text", latest_content.get("content", {}).get("thumbnail_text", ""))
    status.setdefault("notifications", [])
    return status


@app.get("/")
async def root():
    if DIST_DIR.exists():
        return FileResponse(DIST_DIR / "index.html")
    return JSONResponse({"status": "ok", "message": "Telugu Sports Automation API running"})


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "message": "Telugu Sports Automation API running"})


@app.get("/status")
async def get_status() -> JSONResponse:
    return JSONResponse(_load_status())


@app.get("/news")
async def get_news() -> JSONResponse:
    latest_content = _latest_content_payload()
    selected_topic = latest_content.get("selected_topic", {})
    trends = latest_content.get("trends", [])

    if not selected_topic:
        return JSONResponse({"items": []})

    item = {
        "id": selected_topic.get("title", "latest-topic"),
        "title": selected_topic.get("title", "Headline unavailable"),
        "summary": selected_topic.get("summary", "No summary available."),
        "source": selected_topic.get("source", "system"),
        "trending": selected_topic.get("is_trending", bool(trends)),
        "published_at": selected_topic.get("published_at", ""),
        "topic": selected_topic.get("topic", "sports"),
    }
    return JSONResponse({"items": [item]})


@app.get("/decision")
async def get_decision() -> JSONResponse:
    latest_content = _latest_content_payload()
    scored_topic = latest_content.get("scored_topic", {})
    selected_topic = latest_content.get("selected_topic", {})
    payload = {
        "score": scored_topic.get("score", 0),
        "action": scored_topic.get("decision", "SKIP"),
        "reasons": scored_topic.get("reasons", []),
        "selected_topic": selected_topic.get("title", "No topic selected"),
    }
    return JSONResponse(payload)


@app.get("/content")
async def get_content() -> JSONResponse:
    latest_content = _latest_content_payload()
    return JSONResponse(latest_content.get("content", {}))


@app.get("/run")
def run_pipeline() -> dict[str, str]:
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=str(BASE_DIR))
        return {"status": "pipeline started"}
    except Exception as e:
        logging.error("Failed to start pipeline from /run: %s", e)
        return {"error": str(e)}


@app.post("/upload")
async def upload_latest() -> JSONResponse:
    try:
        subprocess.Popen([sys.executable, "main.py", "upload_only"], cwd=str(BASE_DIR))
        return JSONResponse({"status": "upload started", "mode": "upload_only"})
    except Exception as e:
        logging.error("Failed to start upload-only pipeline: %s", e)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/run")
async def post_run(run_request: RunRequest) -> JSONResponse:
    try:
        command = [sys.executable, "main.py"]
        if run_request.mode and run_request.mode != "full":
            command.append(run_request.mode)
        subprocess.Popen(command, cwd=str(BASE_DIR))
        return JSONResponse({"status": "pipeline started", "mode": run_request.mode or "full"})
    except Exception as e:
        logging.error("Failed to start pipeline from POST /run: %s", e)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/retry")
async def retry_pipeline() -> JSONResponse:
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=str(BASE_DIR))
        return JSONResponse({"status": "retry started"})
    except Exception as e:
        logging.error("Failed to retry pipeline: %s", e)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/logs")
async def logs() -> JSONResponse:
    return JSONResponse({"items": _load_logs()})


app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="frontend-assets")

    @app.get("/dashboard")
    async def dashboard() -> FileResponse:
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/dashboard")
    async def dashboard() -> JSONResponse:
        return JSONResponse({"message": "Frontend not built. Pipeline works via API."})
