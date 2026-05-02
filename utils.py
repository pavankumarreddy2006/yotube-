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
    resolved_path = Path(str(log_path or "logs.txt"))
    resolved_path.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    if root.handlers:
        root.setLevel(logging.INFO)
        return

    logging.basicConfig(
        filename=str(resolved_path),
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def load_json(path: str | Path, default: Any = None) -> Any:
    file_path = Path(str(path))
    if not file_path.exists():
        return default
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
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


def dump_json(data: Any, path: str | Path) -> None:
    if not isinstance(path, (str, Path)):
        raise ValueError("Invalid path")

    file_path = Path(str(path))
    file_path.parent.mkdir(parents=True, exist_ok=True)

    with open(str(file_path), "w", encoding="utf-8") as f:
        json.dump(_make_json_safe(data), f, indent=2, ensure_ascii=False)


def _make_json_safe(data: Any) -> Any:
    if is_dataclass(data):
        return _make_json_safe(asdict(data))
    if isinstance(data, dict):
        return {str(key): _make_json_safe(value) for key, value in data.items()}
    if isinstance(data, list):
        return [_make_json_safe(item) for item in data]
    if isinstance(data, tuple):
        return [_make_json_safe(item) for item in data]
    if isinstance(data, Path):
        return str(data)
    if isinstance(data, (str, int, float, bool)) or data is None:
        return data
    if hasattr(data, "__dict__"):
        return _make_json_safe(vars(data))
    return {"data": str(data)}
