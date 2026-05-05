from __future__ import annotations

import hashlib
import hmac
import mimetypes
import time
from pathlib import Path
from typing import Any

import requests

from events import publish_event
from settings import settings
from utils import get_logger, retry


logger = get_logger(__name__)


class CloudStorage:
    def is_enabled(self) -> bool:
        return False

    def upload_file(self, file_path: str | Path, *, folder: str, resource_type: str = "auto") -> dict[str, Any]:
        path = Path(str(file_path))
        return {
            "provider": "local",
            "public_url": str(path),
            "secure_url": str(path),
            "resource_type": resource_type,
            "bytes": path.stat().st_size if path.exists() else 0,
            "public_id": path.stem,
        }


class CloudinaryStorage(CloudStorage):
    def is_enabled(self) -> bool:
        return bool(settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret)

    def upload_file(self, file_path: str | Path, *, folder: str, resource_type: str = "auto") -> dict[str, Any]:
        if not self.is_enabled():
            return super().upload_file(file_path, folder=folder, resource_type=resource_type)

        path = Path(str(file_path))
        if not path.exists():
            raise FileNotFoundError(f"Artifact file not found: {path}")

        timestamp = int(time.time())
        public_id = f"{folder.strip('/')}/{path.stem}".strip("/")
        signature_payload = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{settings.cloudinary_api_secret}"
        signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()
        endpoint = f"https://api.cloudinary.com/v1_1/{settings.cloudinary_cloud_name}/{resource_type}/upload"
        mime_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"

        def operation() -> dict[str, Any]:
            with open(path, "rb") as handle:
                response = requests.post(
                    endpoint,
                    data={
                        "api_key": settings.cloudinary_api_key,
                        "timestamp": timestamp,
                        "folder": folder,
                        "public_id": public_id,
                        "signature": signature,
                    },
                    files={"file": (path.name, handle, mime_type)},
                    timeout=180,
                )
            response.raise_for_status()
            payload = response.json()
            return {
                "provider": "cloudinary",
                "public_url": payload.get("url") or payload.get("secure_url") or "",
                "secure_url": payload.get("secure_url") or payload.get("url") or "",
                "resource_type": payload.get("resource_type", resource_type),
                "bytes": payload.get("bytes", 0),
                "public_id": payload.get("public_id", public_id),
                "version": payload.get("version"),
                "format": payload.get("format"),
            }

        artifact = retry(operation, operation_name=f"cloud upload -> {path}")
        publish_event("artifact_uploaded", f"Uploaded {path.name} to Cloudinary.", {"artifact": artifact})
        return artifact


_storage = CloudinaryStorage()


def get_storage() -> CloudStorage:
    return _storage


def upload_artifact(file_path: str | Path, *, folder: str, resource_type: str = "auto", delete_local: bool = False) -> dict[str, Any]:
    artifact = get_storage().upload_file(file_path, folder=folder, resource_type=resource_type)
    if delete_local and get_storage().is_enabled():
        try:
            Path(str(file_path)).unlink(missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not delete local temp file %s: %s", file_path, exc)
    return artifact
