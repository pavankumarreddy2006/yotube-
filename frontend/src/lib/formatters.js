function formatDateTime(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

export function normalizeStatus(payload) {
  const running = Boolean(payload?.running);
  const failed = Boolean(payload?.failed);
  const rawStatus = String(payload?.status || "").toLowerCase();
  const normalizedStatus = failed ? "failed" : running ? "running" : rawStatus.includes("complete") ? "completed" : "idle";

  return {
    running,
    failed,
    status: normalizedStatus,
    statusLabel: failed ? "Failed" : running ? "Running" : normalizedStatus === "completed" ? "Completed" : "Idle",
    currentStage: payload?.current_stage || "",
    currentTask: payload?.current_task || "Waiting for next automation run",
    progressLabel: payload?.progress_label || payload?.status || "Idle",
    lastRunTime: payload?.last_run_time || "",
    lastRunTimeLabel: formatDateTime(payload?.last_run_time),
    language: payload?.language || "te",
    languageLabel: payload?.language_label || (payload?.language === "en" ? "English" : "Telugu"),
    previewItems: Array.isArray(payload?.preview_items) ? payload.preview_items : [],
    youtubeLinks: Array.isArray(payload?.youtube_links) ? payload.youtube_links : [],
    thumbnailUrl: payload?.thumbnail_url || "",
    thumbnailText: payload?.thumbnail_text || "",
    selectedTopic: payload?.selected_topic || "",
    selectedTopicSummary: payload?.selected_topic_summary || "",
    mode: payload?.mode || "full",
    notifications: Array.isArray(payload?.notifications) ? payload.notifications : [],
    runtime: payload?.runtime || null,
    queue: payload?.queue || { current_job: null, queued_jobs: [], queue_length: 0, completed_jobs: [], failed_jobs: [] },
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
    publishedAt: formatDateTime(item?.published_at),
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
      timestampLabel: formatDateTime(item?.timestamp) || "--",
      level,
      message,
    };
  });
}

export function normalizeConfig(payload) {
  const languages = Array.isArray(payload?.languages) ? payload.languages : [];
  const defaultLanguage = payload?.default_language || "te";
  return {
    defaultLanguage,
    defaultLanguageLabel: defaultLanguage === "en" ? "English" : "Telugu",
    dailyRunTime: payload?.daily_run_time || "",
    dailyRunnerEnabled: Boolean(payload?.daily_runner_enabled),
    languages,
  };
}

export function normalizeRuntime(payload) {
  return {
    defaultLanguage: payload?.default_language || "te",
    defaultMode: payload?.default_mode || "full",
    enableShorts: payload?.enable_shorts !== false,
    enableLongVideo: Boolean(payload?.enable_long_video),
    enableUpload: Boolean(payload?.enable_upload),
    enableNotifications: payload?.enable_notifications !== false,
    ttsProvider: payload?.tts_provider || "gtts",
    preferredNewsSources: Array.isArray(payload?.preferred_news_sources) ? payload.preferred_news_sources : ["cricapi", "newsapi", "fallback"],
    preferredVisualSources: Array.isArray(payload?.preferred_visual_sources) ? payload.preferred_visual_sources : ["article-images", "fallback"],
    shortVideoDuration: payload?.short_video_duration || 45,
    longVideoDuration: payload?.long_video_duration || 180,
    telegramBotToken: payload?.telegram_bot_token || "",
    telegramChatId: payload?.telegram_chat_id || "",
    telegramConnected: Boolean(payload?.telegram_connected),
    promptSeed: payload?.prompt_seed || "",
    promptStyle: payload?.prompt_style || "breaking",
    autoModeLabel: payload?.auto_mode_label || "Full Auto",
    languageOptions: payload?.language_options || [],
    modeOptions: payload?.mode_options || [],
    ttsOptions: payload?.tts_options || [],
    newsSourceOptions: payload?.news_source_options || [],
  };
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
