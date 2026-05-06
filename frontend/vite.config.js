import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
    assetsDir: "static"
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/dashboard-state": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/config": "http://localhost:8000",
      "/status": "http://localhost:8000",
      "/analytics": "http://localhost:8000",
      "/queue": "http://localhost:8000",
      "/news": "http://localhost:8000",
      "/logs": "http://localhost:8000",
      "/runtime-settings": "http://localhost:8000",
      "/telegram": "http://localhost:8000",
      "/automation": "http://localhost:8000",
      "/generate-video": "http://localhost:8000",
      "/render-thumbnail": "http://localhost:8000",
      "/start": "http://localhost:8000",
      "/run": "http://localhost:8000",
      "/retry": "http://localhost:8000",
      "/upload": "http://localhost:8000",
      "/ask": "http://localhost:8000",
      "/events": "http://localhost:8000",
      "/output": "http://localhost:8000"
    }
  }
});
