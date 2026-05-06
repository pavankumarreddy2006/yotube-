const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(buildApiUrl(path), {
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

export function fetchDashboardState() {
  return request("/dashboard-state");
}

export function fetchAnalytics() {
  return request("/analytics");
}

export function startAutomation(payload) {
  return request("/automation/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateVideo(payload) {
  return request("/generate-video", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generatePrompt(payload) {
  return request("/automation/prompt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRuntimeSettings(payload) {
  return request("/runtime-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testTelegram(message) {
  return request("/telegram/test", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function askSportsAi(payload) {
  return request("/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function renderThumbnail(payload) {
  return request("/render-thumbnail", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
