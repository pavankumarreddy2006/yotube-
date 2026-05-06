# CreatorOS Frontend

CreatorOS is a clean, premium frontend for creating, tracking, and publishing AI-powered sports videos. The interface is designed for beginners, YouTube creators, and fast content workflows across cricket, football, kabaddi, and other sports.

## What it includes

- AI sports video dashboard
- YouTube Shorts and full video creation flow
- Trending sports story discovery
- Thumbnail and upload tracking
- Beginner-friendly analytics and automation controls

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

## Backend API base URL

By default, the Vite dev server proxies these routes to `http://localhost:8000`:

- `/status`
- `/news`
- `/decision`
- `/content`
- `/logs`
- `/run`
- `/retry`
- `/upload`

If your backend is hosted elsewhere, add a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=https://your-api-domain.com
```

## Build

```powershell
npm run build
```
