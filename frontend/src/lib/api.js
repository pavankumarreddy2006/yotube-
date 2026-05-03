import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 15000,
});

export async function fetchStatus() {
  const { data } = await api.get("/status");
  return data;
}

export async function fetchNews() {
  const { data } = await api.get("/news");
  return data;
}

export async function fetchLogs() {
  const { data } = await api.get("/logs");
  return data;
}

export async function startAutomation(language) {
  const { data } = await api.post("/start", { language, mode: "full" });
  return data;
}

export async function askSportsAi(payload) {
  const { data } = await api.post("/ask", payload);
  return data;
}
