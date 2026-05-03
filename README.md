# Telugu YouTube Sports Automation

This project combines a FastAPI backend, a React web application, and a resilient content pipeline for a Telugu sports YouTube workflow. It is designed to keep running even when optional external services are unavailable.

## Main files

- `app.py`: FastAPI web application and API endpoints
- `main.py`: pipeline runner
- `data.py`: topic collection and fallback stories
- `content.py`: content generation and fallback templates
- `thumbnail.py`: thumbnail entrypoint
- `thumbnail_generator.py`: Pillow-based thumbnail renderer
- `video.py`: FFmpeg video creation
- `upload.py`: YouTube upload flow
- `frontend/`: Vite React web application

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
- `THUMBNAIL_FONT_PATH`

Useful toggles:

- `ENABLE_UPLOAD`
- `ENABLE_NOTIFICATIONS`
- `ENABLE_VOICE`
- `ENABLE_LONG_VIDEO`

## Run locally

Backend:

```powershell
python main.py
python -m uvicorn app:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## API routes

- `GET /health`
- `GET /status`
- `GET /news`
- `GET /decision`
- `GET /content`
- `GET /logs`
- `POST /run`
- `POST /retry`
- `POST /upload`

## Deployment

`render.yaml` installs Python dependencies, builds the frontend, and serves the FastAPI web application with Uvicorn.

For Render, set these environment variables explicitly if you want a fully green pipeline:

- `ENABLE_UPLOAD=false` unless YouTube OAuth values are configured
- `ENABLE_NOTIFICATIONS=false` unless Telegram values are configured
- `ENABLE_VOICE=false` if outbound TTS access is not available
- `OPENAI_API_KEY` only if you want LLM-generated copy; otherwise the web application uses local fallback templates

## Notes

- Generated output is stored in `output/`.
- The web application falls back to local content when upstream providers fail.
- If upload is disabled, assets are still generated locally.
