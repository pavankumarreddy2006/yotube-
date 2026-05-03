export function formatTimestamp(value) {
  if (!value) {
    return "No recent execution";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function toArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value;
  }
  return fallback;
}

export function normalizeStatus(payload) {
  return {
    running: Boolean(payload?.running),
    failed: Boolean(payload?.failed),
    status: payload?.status || (payload?.failed ? "Failed" : payload?.running ? "Running" : "Idle"),
    currentTask: payload?.current_task || "Waiting for next run",
    lastRunTime: payload?.last_run_time || payload?.lastRunTime || "",
    notifications: toArray(payload?.notifications, []),
    thumbnailUrl: payload?.thumbnail_url || payload?.thumbnailUrl || "",
    thumbnailText: payload?.thumbnail_text || payload?.thumbnailText || ""
  };
}

export function normalizeNews(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || payload?.news || [];
  return items.map((item, index) => ({
    id: item?.id || `${index}-${item?.title || "headline"}`,
    title: item?.title || "Headline unavailable",
    summary: item?.summary || item?.description || "No summary available.",
    source: item?.source || "system",
    trending: Boolean(item?.trending || item?.is_trending),
    publishedAt: item?.published_at || item?.publishedAt || "",
    topic: item?.topic || ""
  }));
}

export function normalizeDecision(payload) {
  return {
    score: payload?.score ?? payload?.decision_score ?? 0,
    action: payload?.action || payload?.decision || "SKIP",
    reasons: toArray(payload?.reasons || payload?.reason, payload?.reason ? [payload.reason] : []),
    selectedTopic: payload?.selected_topic || payload?.selectedTopic || "No topic selected"
  };
}

export function normalizeContent(payload) {
  return {
    hook: payload?.hook || "",
    shortsScript: payload?.shorts_script || payload?.shorts_script_telugu || payload?.shortsScript || "",
    longScript: payload?.long_script || payload?.long_script_english || payload?.longScript || "",
    title: payload?.title || "",
    description: payload?.description || "",
    hashtags: toArray(payload?.hashtags, []),
    thumbnailText: payload?.thumbnail_text || payload?.thumbnailText || ""
  };
}

export function normalizeLogs(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || payload?.logs || [];
  return items.map((item, index) => {
    const message = typeof item === "string" ? item : item?.message || "Log entry unavailable";
    const level = typeof item === "string" ? inferLogLevel(item) : (item?.level || inferLogLevel(message));
    return {
      id: item?.id || `${index}-${message.slice(0, 16)}`,
      timestamp: item?.timestamp || "",
      level,
      message
    };
  });
}

export function inferLogLevel(message) {
  const text = String(message).toLowerCase();
  if (text.includes("error") || text.includes("failed") || text.includes("exception")) {
    return "error";
  }
  if (text.includes("retry") || text.includes("fix") || text.includes("attempt")) {
    return "warning";
  }
  return "success";
}
