import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/status": "http://localhost:8000",
      "/news": "http://localhost:8000",
      "/decision": "http://localhost:8000",
      "/content": "http://localhost:8000",
      "/logs": "http://localhost:8000",
      "/run": "http://localhost:8000",
      "/retry": "http://localhost:8000"
    }
  }
});
