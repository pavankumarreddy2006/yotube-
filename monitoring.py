from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any


STAGE_LIBRARY: list[dict[str, Any]] = [
    {"key": "research", "label": "Research", "icon": "🧠"},
    {"key": "script", "label": "Script", "icon": "✍"},
    {"key": "voice", "label": "Voice", "icon": "🎤"},
    {"key": "thumbnail", "label": "Thumbnail", "icon": "🖼"},
    {"key": "render", "label": "Rendering", "icon": "🎬"},
    {"key": "quality", "label": "Quality Check", "icon": "🛡"},
    {"key": "upload", "label": "Upload", "icon": "📤"},
]


def now_iso() -> str:
    return datetime.now().isoformat()


def default_stage_map() -> list[dict[str, Any]]:
    stages: list[dict[str, Any]] = []
    for item in STAGE_LIBRARY:
        stages.append(
            {
                **item,
                "status": "waiting",
                "progress": 0,
                "message": "",
                "timestamp": "",
            }
        )
    return stages


def default_status() -> dict[str, Any]:
    return {
        "running": False,
        "failed": False,
        "status": "Idle",
        "current_task": "Waiting for next run",
        "last_run_time": "",
        "current_stage": "idle",
        "progress_label": "Idle",
        "overall_progress": 0,
        "eta_seconds": None,
        "started_at": "",
        "completed_at": "",
        "retry_count": 0,
        "max_retries": 0,
        "activity_feed": [],
        "live_logs": [],
        "notifications": [],
        "stages": default_stage_map(),
        "render_status": {
            "active": False,
            "variant": "",
            "title": "",
            "progress": 0,
            "eta_seconds": None,
            "message": "Rendering has not started yet.",
            "updated_at": "",
        },
        "upload_status": {
            "active": False,
            "platform": "YouTube",
            "title": "",
            "variant": "",
            "progress": 0,
            "eta_seconds": None,
            "message": "Upload is waiting.",
            "link": "",
            "updated_at": "",
            "failed": False,
        },
        "quality_status": {
            "active": False,
            "progress": 0,
            "message": "Quality checks pending.",
            "updated_at": "",
            "failed": False,
        },
        "queue": {
            "current_job": None,
            "queued_jobs": [],
            "queue_length": 0,
            "completed_jobs": [],
            "failed_jobs": [],
        },
    }


def ensure_status_shape(payload: dict[str, Any] | None) -> dict[str, Any]:
    status = default_status()
    if isinstance(payload, dict):
        status.update(payload)

    if not isinstance(status.get("stages"), list) or not status["stages"]:
        status["stages"] = default_stage_map()

    known = {item["key"] for item in status["stages"] if isinstance(item, dict) and item.get("key")}
    for item in STAGE_LIBRARY:
        if item["key"] not in known:
            status["stages"].append(
                {
                    **item,
                    "status": "waiting",
                    "progress": 0,
                    "message": "",
                    "timestamp": "",
                }
            )

    for key in ("activity_feed", "live_logs", "notifications"):
        if not isinstance(status.get(key), list):
            status[key] = []

    for key, fallback in {
        "render_status": default_status()["render_status"],
        "upload_status": default_status()["upload_status"],
        "quality_status": default_status()["quality_status"],
        "queue": default_status()["queue"],
    }.items():
        current = status.get(key)
        merged = deepcopy(fallback)
        if isinstance(current, dict):
            merged.update(current)
        status[key] = merged
    return status


def update_stage_snapshot(
    stages: list[dict[str, Any]],
    *,
    stage_key: str,
    stage_status: str,
    progress: int,
    message: str,
    timestamp: str | None = None,
) -> list[dict[str, Any]]:
    updated: list[dict[str, Any]] = []
    ts = timestamp or now_iso()
    for item in stages:
        current = dict(item)
        if current.get("key") == stage_key:
            current.update(
                {
                    "status": stage_status,
                    "progress": max(0, min(100, int(progress))),
                    "message": message,
                    "timestamp": ts,
                }
            )
        updated.append(current)
    return updated
