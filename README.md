# Telugu YouTube Sports Automation

This project combines a FastAPI backend, a React web application, and an automated media pipeline for generating sports videos, subtitles, thumbnails, and uploads.

## Project structure

The repo is now organized around these responsibilities:

- `app.py`: FastAPI API gateway and frontend serving
- `main.py`: pipeline orchestration entrypoint
- `backend/models/`: shared pipeline data models
- `services/`: timing, planning, and orchestration helpers
- `render_engine/`: render integration layer
- `subtitle_engine/`: SRT generation and subtitle timing output
- `thumbnail_engine/`: validated thumbnail generation
- `ml_engine/`: semantic media matching helpers
- `workers/`: queue-oriented worker package
- `frontend/`: Vite + React dashboard
- `tests/`: API, queue, planning, rendering, and thumbnail tests
- `output/`: generated runtime artifacts
- `tmp/`: temporary runtime files

## Legacy compatibility

The root modules like `video.py`, `thumbnail.py`, `queue_manager.py`, `content.py`, and `data.py` still exist as compatibility entrypoints so the current app keeps working while the project is being modularized.

## Daily automation flow

Each full run now aims to:

- fetch fresh sports headlines and cricket updates
- select 5 to 10 non-duplicate highlights
- generate Telugu scripts for a long-form bulletin and a Short
- create subtitle files and rendered videos
- run basic artifact quality checks
- upload both videos to YouTube
- send Telegram success or failure alerts
- retry failed generation runs up to the configured limit

## Setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `.env` from `.env.example` and fill in the values you want to use.

Important variables:

- `NEWSAPI_KEY`
- `CRICAPI_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `FFMPEG_PATH`
- `FFPROBE_PATH`
- `THUMBNAIL_FONT_PATH`
- `BACKGROUND_VIDEO_VERTICAL`
- `BACKGROUND_VIDEO_HORIZONTAL`
- `BACKGROUND_MUSIC_PATH`

Useful toggles:

- `ENABLE_UPLOAD`
- `ENABLE_NOTIFICATIONS`
- `ENABLE_VOICE`
- `ENABLE_LONG_VIDEO`
- `ENABLE_DAILY_RUNNER`
- `ENABLE_SUBTITLES`
- `ENABLE_BACKGROUND_MUSIC`
- `ENABLE_QUALITY_CHECKS`

## Run locally

Backend:

```powershell
python main.py
python main.py upload_only
python -m uvicorn app:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Both together:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## API routes

- `GET /health`
- `GET /dashboard-state`
- `GET /status`
- `GET /news`
- `GET /logs`
- `GET /queue`
- `GET /runtime-settings`
- `GET /analytics`
- `POST /automation/start`
- `POST /automation/prompt`
- `POST /generate-video`
- `POST /retry`
- `POST /upload`
- `POST /render-thumbnail`

## Deployment

`render.yaml` installs Python dependencies, builds the frontend, serves the FastAPI web application with Uvicorn, and runs a daily cron job for `python main.py full`.

The included Render config is tuned for the free 512 MB instance profile:

- runtime artifacts are written to `/tmp/youtube-automation/...`
- only the latest run is retained
- long-form video is disabled by default
- background music is disabled by default to keep temporary media smaller

For Render, set these environment variables explicitly if you want a fully green pipeline:

- `ENABLE_UPLOAD=false` unless YouTube OAuth values are configured
- `ENABLE_NOTIFICATIONS=false` unless Telegram values are configured
- `ENABLE_VOICE=false` if outbound TTS access is not available
- `ENABLE_LONG_VIDEO=false` if you only want Shorts uploads
- `OPENAI_API_KEY` only if you want LLM-generated copy; otherwise the web application uses local fallback templates
- `OUTPUT_DIR=/tmp/youtube-automation/output`
- `TEMP_DIR=/tmp/youtube-automation/tmp`
- `RETAIN_RUN_ARTIFACTS=1`

## Notes

- Generated output is stored in `output/`.
- Frontend production assets are built into `frontend/build/`.
- The web application falls back to local content when upstream providers fail.
- If upload is disabled, assets are still generated locally.
- Duplicate protection uses the latest headline signature to avoid rerunning the same bulletin content.
- Quality checks currently validate file presence, size, and duration before upload.
- Intro and outro paths are configurable, but the current renderer focuses on background video, subtitles, and mixed background music.
