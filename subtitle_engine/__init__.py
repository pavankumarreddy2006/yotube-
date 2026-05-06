from __future__ import annotations

from pathlib import Path

from backend.models import SubtitleCue


class SubtitleEngine:
    def build_srt(self, cues: list[SubtitleCue], output_path: str | Path) -> str:
        destination = Path(str(output_path))
        destination.parent.mkdir(parents=True, exist_ok=True)
        lines: list[str] = []
        for cue in cues:
            lines.append(str(cue.index))
            lines.append(f"{self._fmt(cue.start)} --> {self._fmt(cue.end)}")
            lines.append(cue.text)
            lines.append("")
        destination.write_text("\n".join(lines), encoding="utf-8")
        return str(destination)

    def _fmt(self, seconds: float) -> str:
        total_ms = max(int(round(seconds * 1000)), 0)
        hours = total_ms // 3_600_000
        minutes = (total_ms % 3_600_000) // 60_000
        secs = (total_ms % 60_000) // 1000
        millis = total_ms % 1000
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
