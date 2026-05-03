import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 15000
});

export async function fetchConfig() {
  const { data } = await api.get("/config");
  return data;
}

export async function fetchStatus() {
  const { data } = await api.get("/status");
  return data;
}

export async function fetchNews() {
  const { data } = await api.get("/news");
  return data;
}

export async function fetchDecision() {
  const { data } = await api.get("/decision");
  return data;
}

export async function fetchContent() {
  const { data } = await api.get("/content");
  return data;
}

export async function fetchLogs() {
  const { data } = await api.get("/logs");
  return data;
}

export async function triggerRun(language) {
  const { data } = await api.post("/automation/start", { language, mode: "full" });
  return data;
}

export async function retryFailedTask(language) {
  const { data } = await api.post("/retry", { language, mode: "full" });
  return data;
}

export async function uploadAgain() {
  const { data } = await api.post("/upload");
  return data;
}

export async function generateAiScript(payload) {
  const { data } = await api.post("/ask-ai", payload);
  return data;
}
