from __future__ import annotations

from collections import deque
from datetime import datetime
from threading import Lock
from typing import Any

from settings import OUTPUT_DIR
from utils import dump_json, load_json


EVENTS_FILE = OUTPUT_DIR / "event_history.json"
MAX_EVENT_HISTORY = 20

_lock = Lock()
_state = {
    "next_id": 1,
    "events": deque(maxlen=MAX_EVENT_HISTORY),
}


def _bootstrap() -> None:
    payload = load_json(EVENTS_FILE, default={}) or {}
    events = payload.get("events", []) if isinstance(payload, dict) else []
    next_id = int(payload.get("next_id", len(events) + 1)) if isinstance(payload, dict) else len(events) + 1
    _state["next_id"] = max(1, next_id)
    _state["events"] = deque(events[-MAX_EVENT_HISTORY:], maxlen=MAX_EVENT_HISTORY)


_bootstrap()


def publish_event(event_type: str, message: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    with _lock:
        event = {
            "id": str(_state["next_id"]),
            "type": event_type,
            "message": message,
            "payload": payload or {},
            "timestamp": datetime.now().isoformat(),
        }
        _state["next_id"] += 1
        _state["events"].append(event)
        dump_json({"next_id": _state["next_id"], "events": list(_state["events"])}, EVENTS_FILE)
        return event


def get_event_history(after_id: str | None = None) -> list[dict[str, Any]]:
    events = list(_state["events"])
    if not after_id:
        return events
    try:
        after_int = int(after_id)
    except Exception:
        return events
    return [event for event in events if int(event.get("id", "0") or 0) > after_int]


def latest_event_id() -> str:
    events = list(_state["events"])
    return str(events[-1]["id"]) if events else "0"
