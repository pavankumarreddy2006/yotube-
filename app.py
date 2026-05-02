from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
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


def _load_status() -> dict[str, Any]:
    status = _read_json(OUTPUT_DIR / "pipeline_status.json", default={}) or {}
    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")
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


@app.get("/run")
def run_pipeline() -> dict[str, str]:
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=str(BASE_DIR))
        return {"status": "pipeline started"}
    except Exception as e:
        logging.error("Failed to start pipeline from /run: %s", e)
        return {"error": str(e)}


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


@app.get("/logs")
async def logs() -> PlainTextResponse:
    try:
        return PlainTextResponse(LOG_FILE.read_text(encoding="utf-8"))
    except Exception:
        try:
            return PlainTextResponse(LEGACY_LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return PlainTextResponse("No logs yet")


app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="frontend-assets")
else:
    @app.get("/dashboard")
    async def dashboard() -> JSONResponse:
        return JSONResponse({"message": "Frontend not built. Pipeline works via API."})
