const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === "object" && payload?.detail) ||
      (typeof payload === "string" && payload) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function fetchStatus() {
  return request("/status");
}

export function fetchNews() {
  return request("/news");
}

export function fetchLogs() {
  return request("/logs");
}

export function fetchConfig() {
  return request("/config");
}

export function startAutomation(language) {
  return request("/start", {
    method: "POST",
    body: JSON.stringify({ language, mode: "full" }),
  });
}

export function askSportsAi(payload) {
  return request("/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
