# Frontend Web Application

React + Tailwind web application for monitoring and controlling the Telugu YouTube sports automation workflow.

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

## Backend API base URL

By default the Vite dev server proxies these routes to `http://localhost:8000`:

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
