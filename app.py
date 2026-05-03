from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
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
app = FastAPI(title="Telugu Sports Automation Web Application")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DIST_DIR = BASE_DIR / "frontend" / "dist"
LOG_FILE = BASE_DIR / "logs.txt"
LEGACY_LOG_FILE = OUTPUT_DIR / "pipeline.log"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class RunRequest(BaseModel):
    mode: str | None = "full"


def _read_json(path: Path, default: Any = None) -> Any:
    return load_json(path, default=default)


def _latest_run_payload() -> dict[str, Any]:
    return _read_json(OUTPUT_DIR / "latest_run.json", default={}) or {}


def _latest_work_dir() -> Path | None:
    latest_run = _latest_run_payload()
    work_dir = latest_run.get("work_dir")
    if work_dir:
        candidate = Path(str(work_dir))
        if candidate.exists():
            return candidate

    directories = [item for item in OUTPUT_DIR.iterdir() if item.is_dir()]
    if not directories:
        return None
    return max(directories, key=lambda item: item.stat().st_mtime)


def _latest_content_payload() -> dict[str, Any]:
    work_dir = _latest_work_dir()
    if not work_dir:
        return {}
    return _read_json(work_dir / "content.json", default={}) or {}


def _read_log_text() -> str:
    try:
        return LOG_FILE.read_text(encoding="utf-8")
    except Exception:
        try:
            return LEGACY_LOG_FILE.read_text(encoding="utf-8")
        except Exception:
            return ""


def _load_logs() -> list[dict[str, str]]:
    log_text = _read_log_text()
    if not log_text.strip():
        return []

    items: list[dict[str, str]] = []
    for index, raw_line in enumerate(log_text.splitlines()):
        line = raw_line.strip()
        if not line:
            continue

        parts = line.split(" - ", 2)
        if len(parts) == 3:
            timestamp, level, message = parts
        else:
            timestamp, level, message = "", "INFO", line

        items.append(
            {
                "id": f"log-{index}",
                "timestamp": timestamp,
                "level": level.lower(),
                "message": message,
            }
        )

    return items


def _to_output_url(file_path: str | None) -> str:
    if not file_path:
        return ""

    try:
        relative_path = Path(str(file_path)).resolve().relative_to(OUTPUT_DIR.resolve())
    except Exception:
        return ""

    web_path = str(relative_path).replace("\\", "/")
    return f"/output/{web_path}"


def _load_status() -> dict[str, Any]:
    status = _read_json(OUTPUT_DIR / "pipeline_status.json", default={}) or {}
    status.setdefault("running", False)
    status.setdefault("failed", False)
    status.setdefault("status", "Idle")
    status.setdefault("current_task", "Waiting for next run")
    status.setdefault("last_run_time", "")

    latest_run = _latest_run_payload()
    latest_content = _latest_content_payload()
    status["thumbnail_url"] = _to_output_url(status.get("thumbnail_url")) or _to_output_url(latest_run.get("thumbnail"))
    status.setdefault("thumbnail_text", latest_content.get("content", {}).get("thumbnail_text", ""))
    status.setdefault("notifications", [])
    return status


def _fallback_dashboard_html() -> str:
    return """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Telugu Sports Automation Dashboard</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: rgba(15, 23, 42, 0.9);
        --panel-border: rgba(148, 163, 184, 0.18);
        --accent: #f97316;
        --accent-2: #22c55e;
        --text: #e5eefb;
        --muted: #9fb0cc;
        --danger: #f87171;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(249, 115, 22, 0.2), transparent 28%),
          radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 22%),
          linear-gradient(180deg, #08101f 0%, #0b1020 100%);
      }
      .wrap {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }
      .hero, .grid > section {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 22px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(10px);
      }
      .hero {
        padding: 28px;
        margin-bottom: 20px;
      }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 12px;
        margin-bottom: 10px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(30px, 5vw, 48px);
      }
      .sub {
        color: var(--muted);
        max-width: 760px;
        line-height: 1.6;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font-weight: 700;
        cursor: pointer;
      }
      .primary { background: var(--accent); color: white; }
      .secondary { background: #18253f; color: var(--text); }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
      }
      .grid > section { padding: 20px; }
      h2 {
        margin: 0 0 14px;
        font-size: 18px;
      }
      .label {
        color: var(--muted);
        font-size: 13px;
        margin-top: 12px;
      }
      .value {
        font-size: 16px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .pill {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.16);
        color: #c6f6d5;
        font-weight: 700;
      }
      .pill.fail {
        background: rgba(248, 113, 113, 0.16);
        color: #fecaca;
      }
      .log-list {
        max-height: 340px;
        overflow: auto;
        padding-right: 6px;
      }
      .log-item {
        padding: 10px 0;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
      }
      .log-item:first-child { border-top: 0; }
      .muted { color: var(--muted); }
      img {
        width: 100%;
        border-radius: 18px;
        border: 1px solid var(--panel-border);
        margin-top: 12px;
      }
      ul {
        padding-left: 18px;
        margin: 10px 0 0;
      }
      .banner {
        margin-top: 16px;
        color: var(--muted);
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <div class="eyebrow">Render-safe dashboard</div>
        <h1>Telugu Sports Automation</h1>
        <div class="sub">The React build is missing on this deployment, so this built-in dashboard is rendering directly from FastAPI and loading live data from the same API.</div>
        <div class="actions">
          <button class="primary" onclick="runAction('/run', 'POST')">Run pipeline</button>
          <button class="secondary" onclick="runAction('/retry', 'POST')">Retry pipeline</button>
          <button class="secondary" onclick="runAction('/upload', 'POST')">Upload latest</button>
          <button class="secondary" onclick="loadDashboard()">Refresh now</button>
        </div>
        <div id="banner" class="banner">Loading dashboard data...</div>
      </section>

      <div class="grid">
        <section>
          <h2>Status</h2>
          <div id="status-pill" class="pill">Loading</div>
          <div class="label">Current task</div>
          <div id="current-task" class="value">-</div>
          <div class="label">Last run</div>
          <div id="last-run" class="value">-</div>
        </section>

        <section>
          <h2>Selected News</h2>
          <div id="news-title" class="value">-</div>
          <div class="label">Summary</div>
          <div id="news-summary" class="value muted">No summary loaded yet.</div>
        </section>

        <section>
          <h2>Decision</h2>
          <div class="label">Action</div>
          <div id="decision-action" class="value">-</div>
          <div class="label">Score</div>
          <div id="decision-score" class="value">-</div>
          <div class="label">Reasons</div>
          <ul id="decision-reasons"></ul>
        </section>

        <section>
          <h2>Thumbnail</h2>
          <div id="thumbnail-text" class="value muted">No thumbnail text yet.</div>
          <img id="thumbnail-image" alt="Thumbnail preview" style="display:none" />
        </section>

        <section>
          <h2>Generated Content</h2>
          <div class="label">Shorts script</div>
          <div id="shorts-script" class="value muted">No script yet.</div>
          <div class="label">Hashtags</div>
          <div id="hashtags" class="value muted">-</div>
        </section>

        <section>
          <h2>Logs</h2>
          <div id="logs" class="log-list muted">Waiting for logs...</div>
        </section>
      </div>
    </div>

    <script>
      async function fetchJson(path) {
        const response = await fetch(path, { headers: { "Accept": "application/json" } });
        if (!response.ok) {
          throw new Error(path + " failed with " + response.status);
        }
        return response.json();
      }

      function setText(id, value) {
        document.getElementById(id).textContent = value || "-";
      }

      async function runAction(path, method) {
        const banner = document.getElementById("banner");
        banner.textContent = "Running " + path + "...";
        try {
          const response = await fetch(path, { method: method });
          const data = await response.json();
          banner.textContent = data.status || data.error || "Done";
          setTimeout(loadDashboard, 1200);
        } catch (error) {
          banner.textContent = error.message;
        }
      }

      async function loadDashboard() {
        const banner = document.getElementById("banner");
        banner.textContent = "Refreshing live API data...";
        try {
          const [status, news, decision, content, logs] = await Promise.all([
            fetchJson("/status"),
            fetchJson("/news"),
            fetchJson("/decision"),
            fetchJson("/content"),
            fetchJson("/logs")
          ]);

          const failed = Boolean(status.failed);
          const pill = document.getElementById("status-pill");
          pill.textContent = status.status || (status.running ? "Running" : "Idle");
          pill.className = failed ? "pill fail" : "pill";

          setText("current-task", status.current_task);
          setText("last-run", status.last_run_time);

          const firstNews = (news.items || [])[0] || {};
          setText("news-title", firstNews.title || "No topic selected");
          setText("news-summary", firstNews.summary || "No summary available.");

          setText("decision-action", decision.action);
          setText("decision-score", String(decision.score ?? "-"));

          const reasons = document.getElementById("decision-reasons");
          reasons.innerHTML = "";
          (decision.reasons || []).forEach((reason) => {
            const li = document.createElement("li");
            li.textContent = reason;
            reasons.appendChild(li);
          });
          if (!reasons.children.length) {
            const li = document.createElement("li");
            li.textContent = "No decision reasons available.";
            reasons.appendChild(li);
          }

          setText("thumbnail-text", status.thumbnail_text || content.thumbnail_text || "No thumbnail text yet.");
          const image = document.getElementById("thumbnail-image");
          if (status.thumbnail_url) {
            image.src = status.thumbnail_url;
            image.style.display = "block";
          } else {
            image.style.display = "none";
          }

          setText("shorts-script", content.shorts_script || "No shorts script generated yet.");
          const hashtags = Array.isArray(content.hashtags) ? content.hashtags.join(" ") : (content.hashtags || "-");
          setText("hashtags", hashtags);

          const logsRoot = document.getElementById("logs");
          logsRoot.innerHTML = "";
          (logs.items || []).slice(-20).reverse().forEach((item) => {
            const row = document.createElement("div");
            row.className = "log-item";
            row.textContent = [item.timestamp, item.level, item.message].filter(Boolean).join(" | ");
            logsRoot.appendChild(row);
          });
          if (!logsRoot.children.length) {
            logsRoot.textContent = "No logs available yet.";
          }

          banner.textContent = "Dashboard loaded from API fallback view.";
        } catch (error) {
          banner.textContent = "Failed to load dashboard: " + error.message;
        }
      }

      loadDashboard();
      setInterval(loadDashboard, 30000);
    </script>
  </body>
</html>
"""


@app.get("/")
async def root():
    if DIST_DIR.exists():
        return FileResponse(DIST_DIR / "index.html")
    return HTMLResponse(_fallback_dashboard_html())


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "message": "Telugu Sports Automation API running"})


@app.get("/status")
async def get_status() -> JSONResponse:
    return JSONResponse(_load_status())


@app.get("/news")
async def get_news() -> JSONResponse:
    latest_content = _latest_content_payload()
    selected_topic = latest_content.get("selected_topic", {})
    trends = latest_content.get("trends", [])

    if not selected_topic:
        return JSONResponse({"items": []})

    item = {
        "id": selected_topic.get("title", "latest-topic"),
        "title": selected_topic.get("title", "Headline unavailable"),
        "summary": selected_topic.get("summary", "No summary available."),
        "source": selected_topic.get("source", "system"),
        "trending": selected_topic.get("is_trending", bool(trends)),
        "published_at": selected_topic.get("published_at", ""),
        "topic": selected_topic.get("topic", "sports"),
    }
    return JSONResponse({"items": [item]})


@app.get("/decision")
async def get_decision() -> JSONResponse:
    latest_content = _latest_content_payload()
    scored_topic = latest_content.get("scored_topic", {})
    selected_topic = latest_content.get("selected_topic", {})
    payload = {
        "score": scored_topic.get("score", 0),
        "action": scored_topic.get("decision", "SKIP"),
        "reasons": scored_topic.get("reasons", []),
        "selected_topic": selected_topic.get("title", "No topic selected"),
    }
    return JSONResponse(payload)


@app.get("/content")
async def get_content() -> JSONResponse:
    latest_content = _latest_content_payload()
    content = latest_content.get("content", {}) or {}
    payload = dict(content)
    payload.setdefault("shorts_script", content.get("shorts_script_telugu", ""))
    payload.setdefault("long_script", content.get("long_script_english", ""))
    payload.setdefault("hashtags", content.get("hashtags", []))
    return JSONResponse(payload)


@app.get("/run")
def run_pipeline() -> dict[str, str]:
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=str(BASE_DIR))
        return {"status": "pipeline started"}
    except Exception as e:
        logging.error("Failed to start pipeline from /run: %s", e)
        return {"error": str(e)}


@app.post("/upload")
async def upload_latest() -> JSONResponse:
    try:
        subprocess.Popen([sys.executable, "main.py", "upload_only"], cwd=str(BASE_DIR))
        return JSONResponse({"status": "upload started", "mode": "upload_only"})
    except Exception as e:
        logging.error("Failed to start upload-only pipeline: %s", e)
        return JSONResponse({"error": str(e)}, status_code=500)


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


@app.post("/retry")
async def retry_pipeline() -> JSONResponse:
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=str(BASE_DIR))
        return JSONResponse({"status": "retry started"})
    except Exception as e:
        logging.error("Failed to retry pipeline: %s", e)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/logs")
async def logs() -> JSONResponse:
    return JSONResponse({"items": _load_logs()})


app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="frontend-assets")

    def _serve_frontend() -> FileResponse:
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/dashboard")
    async def dashboard() -> FileResponse:
        return _serve_frontend()

    @app.get("/{full_path:path}")
    async def frontend_routes(full_path: str) -> FileResponse:
        if full_path.startswith(("health", "status", "news", "decision", "content", "run", "retry", "upload", "logs", "output", "assets")):
            raise HTTPException(status_code=404, detail="Not found")

        candidate = DIST_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return _serve_frontend()
else:
    @app.get("/dashboard")
    async def dashboard() -> HTMLResponse:
        return HTMLResponse(_fallback_dashboard_html())
