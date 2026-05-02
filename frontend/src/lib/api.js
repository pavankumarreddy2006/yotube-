import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 10000
});

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

export async function triggerRun() {
  const { data } = await api.post("/run");
  return data;
}

export async function retryFailedTask() {
  const { data } = await api.post("/retry");
  return data;
}

export async function uploadAgain() {
  const { data } = await api.post("/upload");
  return data;
}
