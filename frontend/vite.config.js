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
      "/status": "http://localhost:8000",
      "/news": "http://localhost:8000",
      "/logs": "http://localhost:8000",
      "/start": "http://localhost:8000",
      "/ask": "http://localhost:8000"
    }
  }
});
