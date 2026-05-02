from __future__ import annotations

import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from main import run_pipeline
from settings import OUTPUT_DIR
from utils import dump_json, get_logger, load_json

logger = get_logger(__name__)
app = FastAPI(title="Telugu Sports Automation Dashboard")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "frontend" / "dist"

# Ensure directories
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Render Linux font fallback
if "THUMBNAIL_FONT_PATH" not in os.environ:
    os.environ["THUMBNAIL_FONT_PATH"] = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

pipeline_lock = threading.Lock()


class RunRequest(BaseModel):
    mode: str | None = "full"


def _read_json(path: Path, default: Any = None) -> Any:
    return load_json(path, default=default)


def _latest_run_file() -> Path | None:
    latest_path = OUTPUT_DIR / "latest_run.json"
    if latest_path.exists():
        return latest_path

    run_dirs = sorted([entry for entry in OUTPUT_DIR.iterdir() if entry.is_dir()], key=lambda item: item.name)
    if not run_dirs:
        return None
    candidate = run_dirs[-1] / "run.json"
    return candidate if candidate.exists() else None


def _load_latest_run() -> dict[str, Any] | None:
    run_file = _latest_run_file()
    if not run_file:
        return None
    return _read_json(run_file, default=None)


def _load_status() -> dict[str, Any]:
    status = _read_json(OUTPUT_DIR / "pipeline_status.json", default={}) or {}
    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")
    status.setdefault("notifications", [])
    status.setdefault("thumbnail_url", "")
    status.setdefault("thumbnail_text", "")
    return status


def _format_logs() -> list[str]:
    log_path = OUTPUT_DIR / "pipeline.log"
    if not log_path.exists():
        return []
    text = log_path.read_text(encoding="utf-8")
    return [line for line in text.splitlines() if line.strip()]


def _format_news() -> list[dict[str, Any]]:
    news = _read_json(OUTPUT_DIR / "latest_candidates.json", default=[])
    if news:
        return news
    latest = _load_latest_run()
    if not latest:
        return []
    selected = latest.get("selected_topic")
    return [selected] if selected else []


def _format_decision() -> dict[str, Any]:
    latest = _load_latest_run() or {}
    decision = latest.get("scored_topic", {})
    return {
        "score": decision.get("score", 0),
        "action": decision.get("decision", "SKIP"),
        "reasons": decision.get("reasons", []),
        "selectedTopic": latest.get("selected_topic", {}).get("title", ""),
    }


def _format_content() -> dict[str, Any]:
    latest = _load_latest_run() or {}
    return latest.get("content", {})


def _run_pipeline_thread(mode: str) -> None:
    if pipeline_lock.locked():
        return
    with pipeline_lock:
        try:
            run_pipeline(mode=mode)
        except Exception as exc:
            logger.exception("Background pipeline failed: %s", exc)
            dump_json(
                OUTPUT_DIR / "pipeline_status.json",
                {
                    "running": False,
                    "failed": True,
                    "status": "Failed",
                    "current_task": "Pipeline error",
                    "last_run_time": datetime.now().isoformat(),
                    "notifications": [],
                },
            )


# ====================== ROUTES ======================
@app.get("/status")
async def get_status() -> JSONResponse:
    return JSONResponse(_load_status())


@app.get("/news")
async def get_news() -> JSONResponse:
    return JSONResponse(_format_news())


@app.get("/decision")
async def get_decision() -> JSONResponse:
    return JSONResponse(_format_decision())


@app.get("/content")
async def get_content() -> JSONResponse:
    return JSONResponse(_format_content())


@app.get("/logs")
async def get_logs() -> JSONResponse:
    return JSONResponse(_format_logs())


@app.post("/run")
async def post_run(run_request: RunRequest) -> JSONResponse:
    mode = (run_request.mode or "full").lower()
    if pipeline_lock.locked():
        raise HTTPException(status_code=409, detail="Pipeline is already running.")

    thread = threading.Thread(target=_run_pipeline_thread, args=(mode,), daemon=True)
    thread.start()
    return JSONResponse({"status": "queued", "mode": mode})


@app.post("/retry")
async def post_retry() -> JSONResponse:
    if pipeline_lock.locked():
        raise HTTPException(status_code=409, detail="Pipeline is already running.")
    thread = threading.Thread(target=_run_pipeline_thread, args=("full",), daemon=True)
    thread.start()
    return JSONResponse({"status": "queued", "mode": "retry"})


# ====================== ROOT ROUTE ======================
if DIST_DIR.exists():
    app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "status": "ok",
            "message": "Telugu Sports Automation Backend is Running Successfully! 🚀",
            "endpoints": {
                "/status": "Get pipeline status",
                "/run": "Start pipeline",
                "/logs": "View logs"
            }
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)