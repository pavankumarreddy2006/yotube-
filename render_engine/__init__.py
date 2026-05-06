from __future__ import annotations

from pathlib import Path

from subtitle_engine import SubtitleEngine
from video import build_video as legacy_build_video


class RenderEngine:
    def __init__(self) -> None:
        self.subtitle_engine = SubtitleEngine()

    def render(
        self,
        *,
        audio_path: str | Path | None,
        image_path: str | Path | None,
        output_path: str | Path,
        vertical: bool,
        script: str,
        highlights: list[str],
        visual_queries: list[str],
        scene_image_paths: list[str],
    ) -> str:
        return legacy_build_video(
            audio_path=audio_path,
            image_path=image_path,
            output_path=output_path,
            vertical=vertical,
            script=script,
            highlights=highlights,
            visual_queries=visual_queries,
            scene_image_paths=scene_image_paths,
        )
