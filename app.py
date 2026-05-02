from __future__ import annotations

import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from main import run_pipeline
from settings import OUTPUT_DIR
from utils import get_logger, load_json

logger = get_logger(__name__)
app = FastAPI(title="Telugu Sports Automation Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
pipeline_lock = threading.Lock()


class RunRequest(BaseModel):
    mode: str | None = "full"


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Telugu Sports Automation Backend Running Successfully! 🚀"
    }


@app.get("/status")
async def get_status():
    return JSONResponse(load_json(OUTPUT_DIR / "pipeline_status.json", {}))


@app.get("/logs")
async def get_logs():
    log_path = OUTPUT_DIR / "pipeline.log"
    try:
        if log_path.exists():
            logs = log_path.read_text(encoding="utf-8").splitlines()[-500:]
            return {"logs": logs}
        return {"logs": ["No logs yet. Start pipeline using /run"]}
    except Exception as e:
        return {"logs": [f"Error reading logs: {str(e)}"]}


@app.post("/run")
async def trigger_pipeline(run_request: RunRequest):
    if pipeline_lock.locked():
        raise HTTPException(status_code=409, detail="Pipeline is already running")

    mode = (run_request.mode or "full").lower()

    def background_task():
        try:
            run_pipeline(mode=mode)
        except Exception as e:
            logger.exception("Background pipeline failed")

    thread = threading.Thread(target=background_task, daemon=True)
    thread.start()

    return {"status": "success", "message": f"Pipeline started in {mode} mode"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)