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
  return Array.isArray(value) ? value : fallback;
}

export function normalizeStatus(payload) {
  return {
    running: Boolean(payload?.running),
    failed: Boolean(payload?.failed),
    status: payload?.status || (payload?.failed ? "Failed" : payload?.running ? "Processing" : "Idle"),
    currentTask: payload?.current_task || "Waiting for next run",
    currentStage: payload?.current_stage || "idle",
    progressLabel: payload?.progress_label || payload?.status || "Idle",
    lastRunTime: payload?.last_run_time || "",
    notifications: toArray(payload?.notifications, []),
    thumbnailUrl: payload?.thumbnail_url || "",
    thumbnailText: payload?.thumbnail_text || "",
    language: payload?.language || "te",
    languageLabel: payload?.language_label || (payload?.language === "en" ? "English" : "Telugu"),
    previewItems: toArray(payload?.preview_items, []),
    youtubeLinks: toArray(payload?.youtube_links, []),
    selectedTopic: payload?.selected_topic || "",
    selectedTopicSummary: payload?.selected_topic_summary || ""
  };
}

export function normalizeNews(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || [];
  return items.map((item, index) => ({
    id: item?.id || `${index}-${item?.title || "headline"}`,
    title: item?.title || "Headline unavailable",
    summary: item?.summary || "No summary available.",
    source: item?.source || "system",
    trending: Boolean(item?.trending || item?.is_trending),
    publishedAt: item?.published_at || "",
    topic: item?.topic || "",
    category: item?.category || "Sports"
  }));
}

export function normalizeDecision(payload) {
  return {
    score: payload?.score ?? 0,
    action: payload?.action || "HOLD",
    reasons: toArray(payload?.reasons, []),
    selectedTopic: payload?.selected_topic || "No topic selected"
  };
}

export function normalizeContent(payload) {
  return {
    hook: payload?.hook || "",
    shortsScript: payload?.shorts_script || "",
    longScript: payload?.long_script || "",
    title: payload?.title || "",
    description: payload?.description || "",
    hashtags: toArray(payload?.hashtags, []),
    thumbnailText: payload?.thumbnail_text || "",
    language: payload?.language || "te",
    languageLabel: payload?.language_label || (payload?.language === "en" ? "English" : "Telugu"),
    previewItems: toArray(payload?.preview_items, [])
  };
}

export function normalizeLogs(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || [];
  return items.map((item, index) => {
    const message = typeof item === "string" ? item : item?.message || "Log entry unavailable";
    return {
      id: item?.id || `${index}-${message.slice(0, 16)}`,
      timestamp: item?.timestamp || "",
      level: typeof item === "string" ? inferLogLevel(item) : item?.level || inferLogLevel(message),
      message
    };
  });
}

export function inferLogLevel(message) {
  const text = String(message).toLowerCase();
  if (text.includes("error") || text.includes("failed")) {
    return "error";
  }
  if (text.includes("retry") || text.includes("attempt")) {
    return "warning";
  }
  return "success";
}
