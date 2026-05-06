# AI YouTube Sports Automation Platform

This project is an AI-assisted YouTube automation system for sports content. It combines news research, topic selection, script generation, voice synthesis, thumbnail generation, video rendering, upload automation, a web dashboard, and a lightweight self-improvement loop.

The current platform is designed to support:

- sports news collection and ranking
- AI-generated YouTube Shorts and long-form scripts
- thumbnail and title support
- automated rendering and packaging
- upload workflows
- dashboard monitoring
- daily learning state and optimization recommendations

## What It Does

Each automation run can:

- collect sports stories from configured sources
- detect trending topics and high-interest moments
- rank opportunities for likely CTR, retention, and engagement
- choose a lead topic
- generate a content package with title, description, scripts, highlights, and visual prompts
- synthesize voiceover
- render short and long videos
- create a thumbnail
- run basic quality checks
- upload artifacts if enabled
- store analytics-like optimization feedback for future runs

## Architecture

Core modules:

- `app.py`: FastAPI API server, dashboard state, analytics, intelligence endpoints, frontend serving
- `main.py`: orchestration for the full automation pipeline
- `content.py`: script and content package generation
- `data.py`: news ingestion, trend collection, topic candidate building
- `ml_engine/intelligence.py`: opportunity ranking, trend signals, learning state, optimization recommendations
- `services/planning_service.py`: scene planning, subtitle timing, render planning
- `video.py`: video assembly
- `voice.py`: TTS generation
- `thumbnail.py` and `thumbnail_generator.py`: thumbnail production
- `queue_manager.py`: job queue and background execution
- `runtime.py`: persistent runtime settings
- `backend/models/`: shared dataclasses for render planning
- `frontend/`: React dashboard
- `tests/`: API, content, render-planning, queue, thumbnail, and intelligence coverage

Artifacts and runtime state:

- `output/`: generated media, content payloads, latest run metadata, learning state
- `tmp/`: temporary processing files
- `logs.txt`: runtime logs

## Intelligence Layer

The platform now includes a lightweight optimization engine in `ml_engine/intelligence.py`.

It currently provides:

- trend signal snapshots
- static competitor insight templates
- content opportunity scoring
- simulated performance snapshots for:
  - CTR
  - retention
  - average view duration
  - engagement rate
  - impressions
  - likes, comments, shares
- optimization recommendations for:
  - thumbnails
  - titles
  - retention pacing
  - engagement prompts
  - publishing strategy
- persistent daily learning state in `output/learning_state.json`

This is an internal optimization layer, not a full external ML training system yet. It is meant to create a stable architecture for later integration with real YouTube Analytics, social APIs, or custom model training.

## Main Workflow

Typical `full` run:

1. Fetch sports candidates and trend keywords
2. Score content opportunities
3. Select lead topic and supporting highlights
4. Generate title, scripts, description, tags, hooks, highlights, and visual prompts
5. Generate thumbnail
6. Generate voice tracks
7. Render Shorts and/or long-form videos
8. Run quality checks
9. Upload if enabled
10. Save optimization report and update learning state

## Setup

Create an environment and install dependencies:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `.env` from `.env.example` and configure the values you need.

Important variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEWSAPI_KEY`
- `CRICAPI_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `FFMPEG_PATH`
- `FFPROBE_PATH`
- `OUTPUT_DIR`
- `TEMP_DIR`

Useful feature toggles:

- `ENABLE_UPLOAD`
- `ENABLE_NOTIFICATIONS`
- `ENABLE_VOICE`
- `ENABLE_LONG_VIDEO`
- `ENABLE_DAILY_RUNNER`
- `ENABLE_SUBTITLES`
- `ENABLE_BACKGROUND_MUSIC`
- `ENABLE_QUALITY_CHECKS`

## Run Locally

Backend:

```powershell
python main.py
python main.py full
python main.py upload_only
python -m uvicorn app:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Convenience script:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## API Overview

Core endpoints:

- `GET /health`
- `GET /dashboard-state`
- `GET /status`
- `GET /news`
- `GET /logs`
- `GET /queue`
- `GET /runtime-settings`
- `GET /analytics`
- `GET /intelligence`
- `POST /automation/start`
- `POST /automation/prompt`
- `POST /ask-ai`
- `POST /generate-video`
- `POST /retry`
- `POST /upload`
- `POST /render-thumbnail`

## Generated Files

Each run may create:

- `content.json`: selected topic, highlights, generated content package, trends, opportunity scores
- `optimization_report.json`: performance snapshot, recommendations, learning state snapshot
- `thumbnail.jpg`
- `shorts.mp3`
- `long.mp3`
- `shorts.mp4`
- `long.mp4`
- subtitle outputs when enabled

Global state files:

- `output/latest_run.json`
- `output/pipeline_status.json`
- `output/runtime_settings.json`
- `output/learning_state.json`

## Testing

Run the test suite with:

```powershell
python -m unittest discover tests
```

## Deployment

The repository includes `render.yaml` for deployment on Render. The current deployment model:

- installs Python dependencies
- builds the frontend
- serves FastAPI with Uvicorn
- supports scheduled execution through the daily runner

Recommended cloud-safe settings if external integrations are incomplete:

- `ENABLE_UPLOAD=false`
- `ENABLE_NOTIFICATIONS=false`
- `ENABLE_VOICE=false` if TTS access is unavailable
- `ENABLE_LONG_VIDEO=false` for lighter resource use
- `OUTPUT_DIR=/tmp/youtube-automation/output`
- `TEMP_DIR=/tmp/youtube-automation/tmp`
- `RETAIN_RUN_ARTIFACTS=1`

## Current Limits

The platform already has the structure for an autonomous media workflow, but a few pieces are still simplified:

- competitor analysis uses curated heuristics, not live YouTube scraping
- optimization feedback is simulated unless real analytics data is connected
- trend discovery relies on configured APIs and fallbacks
- title and thumbnail optimization are recommendation-driven, not multivariate-tested automatically

## Technical Guide

For deeper implementation details, see [DOCUMENTATION.md](./DOCUMENTATION.md).
