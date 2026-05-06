from __future__ import annotations

import threading
import uuid
from collections import deque
from datetime import datetime
from typing import Any, Callable

from events import publish_event
from settings import OUTPUT_DIR
from utils import dump_json, load_json


QUEUE_FILE = OUTPUT_DIR / "queue_state.json"


class JobQueueManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._queue: deque[dict[str, Any]] = deque()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._current_job_id: str | None = None
        self._worker_started = False
        self._load_state()

    def start(self, worker: Callable[[dict[str, Any]], None]) -> None:
        with self._lock:
            if self._worker_started:
                return
            self._worker_started = True
        thread = threading.Thread(target=self._worker_loop, args=(worker,), daemon=True, name="pipeline-job-queue")
        thread.start()

    def enqueue(self, *, mode: str, language: str, prompt: str = "") -> dict[str, Any]:
        with self._lock:
            job_id = f"job-{uuid.uuid4().hex[:12]}"
            job = {
                "id": job_id,
                "mode": mode,
                "language": language,
                "prompt": prompt,
                "status": "queued",
                "created_at": datetime.now().isoformat(),
                "started_at": "",
                "completed_at": "",
                "error": "",
                "current_stage": "queued",
                "current_task": "Queued for processing",
                "progress": 0.0,
            }
            self._queue.append(job)
            self._jobs[job_id] = job
            self._persist_locked()
            publish_event("job_queued", f"Job queued for {mode} mode.", {"job": job, "position": len(self._queue)})
            return self._serialize_locked(job)

    def mark_current_job_stage(self, stage: str, detail: str = "") -> None:
        with self._lock:
            if not self._current_job_id or self._current_job_id not in self._jobs:
                return
            job = self._jobs[self._current_job_id]
            job["current_stage"] = stage
            job["current_task"] = detail
            job["progress"] = _stage_progress(stage)
            self._persist_locked()

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return self._snapshot_locked()

    def _worker_loop(self, worker: Callable[[dict[str, Any]], None]) -> None:
        while True:
            job = None
            with self._lock:
                if self._queue:
                    job = self._queue.popleft()
                    self._current_job_id = job["id"]
                    job["status"] = "running"
                    job["started_at"] = datetime.now().isoformat()
                    job["current_stage"] = "started"
                    job["current_task"] = "Worker started"
                    job["progress"] = _stage_progress("started")
                    self._persist_locked()
            if not job:
                threading.Event().wait(1)
                continue
            publish_event("job_started", f"Job started: {job['mode']}.", {"job": self._serialize(job)})
            try:
                worker(job)
                with self._lock:
                    job["status"] = "completed"
                    job["completed_at"] = datetime.now().isoformat()
                    job["progress"] = 1.0
                    self._current_job_id = None
                    self._persist_locked()
                publish_event("job_completed", f"Job completed: {job['mode']}.", {"job": self._serialize(job)})
            except Exception as exc:  # noqa: BLE001
                with self._lock:
                    job["status"] = "failed"
                    job["error"] = str(exc)
                    job["completed_at"] = datetime.now().isoformat()
                    job["progress"] = _stage_progress("failed")
                    self._current_job_id = None
                    self._persist_locked()
                publish_event("job_failed", f"Job failed: {job['mode']}.", {"job": self._serialize(job), "error": str(exc)})

    def _snapshot_locked(self) -> dict[str, Any]:
        queued = [self._serialize_locked(job, position=index + 1) for index, job in enumerate(self._queue)]
        current = self._jobs.get(self._current_job_id) if self._current_job_id else None
        return {
            "current_job": self._serialize_locked(current, position=0) if current else None,
            "queued_jobs": queued,
            "queue_length": len(queued),
            "completed_jobs": [self._serialize_locked(job) for job in list(self._jobs.values()) if job.get("status") == "completed"][-10:],
            "failed_jobs": [self._serialize_locked(job) for job in list(self._jobs.values()) if job.get("status") == "failed"][-10:],
        }

    def _serialize_locked(self, job: dict[str, Any] | None, position: int | None = None) -> dict[str, Any] | None:
        if not job:
            return None
        payload = dict(job)
        if position is not None:
            payload["position"] = position
        return payload

    def _serialize(self, job: dict[str, Any]) -> dict[str, Any]:
        return dict(job)

    def _persist_locked(self) -> None:
        dump_json(
            {
                "current_job_id": self._current_job_id,
                "jobs": list(self._jobs.values())[-50:],
                "queued_job_ids": [job["id"] for job in self._queue],
            },
            QUEUE_FILE,
        )

    def _load_state(self) -> None:
        payload = load_json(QUEUE_FILE, default={}) or {}
        jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
        if not isinstance(jobs, list):
            jobs = []
        self._jobs = {str(job.get("id")): dict(job) for job in jobs if isinstance(job, dict) and job.get("id")}
        queued_job_ids = payload.get("queued_job_ids", []) if isinstance(payload, dict) else []
        self._queue = deque(
            [
                self._jobs[job_id]
                for job_id in queued_job_ids
                if isinstance(job_id, str) and job_id in self._jobs and self._jobs[job_id].get("status") == "queued"
            ]
        )
        current_job_id = payload.get("current_job_id") if isinstance(payload, dict) else None
        self._current_job_id = current_job_id if isinstance(current_job_id, str) and current_job_id in self._jobs else None
        if self._current_job_id and self._current_job_id in self._jobs:
            current = self._jobs[self._current_job_id]
            current["status"] = "queued"
            current["current_task"] = "Recovered after restart"
            self._queue.appendleft(current)
            self._current_job_id = None


def _stage_progress(stage: str) -> float:
    mapping = {
        "queued": 0.0,
        "started": 0.05,
        "news_fetched": 0.2,
        "script_ready": 0.38,
        "voice_generated": 0.56,
        "video_created": 0.78,
        "uploading": 0.9,
        "completed": 1.0,
        "failed": 1.0,
    }
    return mapping.get(stage, 0.1)


job_queue = JobQueueManager()
