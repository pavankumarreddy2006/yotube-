from __future__ import annotations

import json
import logging
import random
import time
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, Callable, TypeVar


T = TypeVar("T")


def setup_logging(log_path: str | Path | None = None) -> None:
    root = logging.getLogger()
    if root.handlers:
        return

    handlers = [logging.StreamHandler()]
    if log_path is not None:
        file_handler = logging.FileHandler(str(log_path), encoding="utf-8")
        handlers.append(file_handler)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=handlers,
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def load_json(path: str | Path, default: Any = None) -> Any:
    path = Path(path)
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def retry(
    operation: Callable[[], T],
    *,
    attempts: int = 3,
    delay_seconds: float = 2.0,
    backoff: float = 2.0,
    operation_name: str = "operation",
    on_error: Callable[[Exception, int], None] | None = None,
    should_retry: Callable[[Exception, int], bool] | None = None,
) -> T:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return operation()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if on_error:
                on_error(exc, attempt)
            if should_retry is not None and not should_retry(exc, attempt):
                raise
            if attempt < attempts:
                time.sleep(delay_seconds)
                delay_seconds *= backoff
    assert last_error is not None
    raise RuntimeError(f"{operation_name} failed after {attempts} attempts") from last_error


def slugify(value: str) -> str:
    filtered = "".join(ch.lower() if ch.isalnum() else "-" for ch in value)
    collapsed = "-".join(part for part in filtered.split("-") if part)
    return collapsed[:80] or f"item-{random.randint(1000, 9999)}"


def dump_json(path: str | Path, payload: Any) -> None:
    serializable = asdict(payload) if is_dataclass(payload) else payload
    Path(path).write_text(
        json.dumps(serializable, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
