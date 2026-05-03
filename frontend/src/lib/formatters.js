export function normalizeStatus(payload) {
  const rawStatus = String(payload?.status || "").toLowerCase();
  const rawStage = String(payload?.current_stage || "").toLowerCase();
  const normalizedStatus = payload?.failed
    ? "Error"
    : rawStatus.includes("upload")
      ? "Uploading"
      : payload?.running
        ? "Running"
        : rawStatus.includes("complete")
          ? "Completed"
          : "Idle";

  return {
    running: Boolean(payload?.running),
    failed: Boolean(payload?.failed),
    status: normalizedStatus,
    currentStage: rawStage || (normalizedStatus === "Completed" ? "completed" : normalizedStatus.toLowerCase()),
    currentTask: payload?.current_task || "Waiting for next automation run",
    lastRunTime: payload?.last_run_time || "",
    language: payload?.language || "te",
    languageLabel: payload?.language_label || (payload?.language === "en" ? "English" : "Telugu"),
    previewItems: Array.isArray(payload?.preview_items) ? payload.preview_items : [],
    youtubeLinks: Array.isArray(payload?.youtube_links) ? payload.youtube_links : [],
    thumbnailUrl: payload?.thumbnail_url || "",
    selectedTopic: payload?.selected_topic || "",
    selectedTopicSummary: payload?.selected_topic_summary || "",
  };
}

export function normalizeNews(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || [];
  return items.map((item, index) => ({
    id: item?.id || `news-${index}`,
    image: item?.image || item?.image_url || "",
    title: item?.title || "Sports headline unavailable",
    summary: item?.summary || "No summary available.",
    source: item?.source || "system",
    category: item?.category || item?.topic || "Sports",
  }));
}

export function normalizeLogs(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items || [];
  return items.map((item, index) => {
    const message = typeof item === "string" ? item : item?.message || "Log unavailable";
    const level = typeof item === "string" ? inferLogLevel(message) : inferLogLevel(item?.level || message);
    return {
      id: item?.id || `log-${index}`,
      timestamp: item?.timestamp || "",
      level,
      message,
    };
  });
}

function inferLogLevel(input) {
  const text = String(input).toLowerCase();
  if (text.includes("error") || text.includes("fail")) {
    return "error";
  }
  if (text.includes("success") || text.includes("complete") || text.includes("uploaded") || text.includes("created")) {
    return "success";
  }
  return "info";
}
