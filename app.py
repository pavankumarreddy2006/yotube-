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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "frontend" / "dist"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Render font fallback
if "THUMBNAIL_FONT_PATH" not in os.environ:
    os.environ["THUMBNAIL_FONT_PATH"] = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

pipeline_lock = threading.Lock()


class RunRequest(BaseModel):
    mode: str | None = "full"


# ====================== HELPER FUNCTIONS ======================
def _read_json(path: Path, default: Any = None) -> Any:
    return load_json(path, default=default)


def _load_status() -> dict[str, Any]:
    status = _read_json(OUTPUT_DIR / "pipeline_status.json", default={}) or {}
    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    return status


def _run_pipeline_thread(mode: str = "full"):
    if pipeline_lock.locked():
        return
    with pipeline_lock:
        try:
            run_pipeline(mode=mode)
        except Exception as exc:
            logger.exception("Pipeline crashed: %s", exc)


# ====================== ENDPOINTS ======================
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Telugu Sports Automation Backend Running Successfully! 🚀",
        "endpoints": {
            "/status": "Current status",
            "/run": "Start automation",
            "/logs": "View logs"
        }
    }


@app.get("/status")
async def get_status():
    return JSONResponse(_load_status())


@app.get("/logs")
async def get_logs():
    log_path = OUTPUT_DIR / "pipeline.log"
    if log_path.exists():
        logs = log_path.read_text(encoding="utf-8").splitlines()[-200:]  # last 200 lines
        return {"logs": logs}
    return {"logs": ["No logs yet. Run the pipeline first."]}


@app.post("/run")
async def trigger_pipeline(run_request: RunRequest):
    mode = (run_request.mode or "full").lower()
    if pipeline_lock.locked():
        raise HTTPException(status_code=409, detail="Pipeline is already running.")

    thread = threading.Thread(target=_run_pipeline_thread, args=(mode,), daemon=True)
    thread.start()
    return {"status": "success", "message": f"Pipeline started in {mode} mode"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)