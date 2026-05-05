import { useEffect, useMemo, useRef, useState } from "react";
import { askSportsAi, fetchDashboardState, generatePrompt, startAutomation, testTelegram, updateRuntimeSettings } from "../lib/api";
import { normalizeLogs, normalizeNews, normalizeRuntime, normalizeStatus } from "../lib/formatters";

const initialState = {
  bootstrapLoading: true,
  statusLoading: false,
  error: "",
  status: null,
  news: [],
  logs: [],
  runtime: null,
  language: "te",
  promptInput: "",
  askAiResult: null,
  generatedPrompt: "",
  toasts: [],
  events: [],
  actionState: {
    auto: false,
    short: false,
    long: false,
    prompt: false,
    saveSettings: false,
    telegram: false,
  },
};

export function useDashboardData() {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);
  const seenNotificationsRef = useRef(new Set());

  function setPartial(updater) {
    if (mountedRef.current) {
      setState(updater);
    }
  }

  function pushToast(message, tone = "info") {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setPartial((prev) => ({
      ...prev,
      toasts: [...prev.toasts, { id, message, tone }].slice(-5),
    }));
    window.setTimeout(() => {
      setPartial((prev) => ({ ...prev, toasts: prev.toasts.filter((item) => item.id !== id) }));
    }, 5000);
  }

  function applySnapshot(payload) {
    const status = normalizeStatus(payload?.status || {});
    const news = normalizeNews(payload?.news || {});
    const logs = normalizeLogs(payload?.logs || {});
    const runtime = normalizeRuntime(payload?.runtime || status.runtime || {});
    const events = Array.isArray(payload?.events) ? payload.events : [];

    for (const item of status.notifications || []) {
      if (!seenNotificationsRef.current.has(item.id)) {
        seenNotificationsRef.current.add(item.id);
        const tone = status.failed || String(item.message || "").toLowerCase().includes("fail") || String(item.message || "").toLowerCase().includes("error")
          ? "error"
          : String(item.message || "").toLowerCase().includes("success") || String(item.message || "").toLowerCase().includes("completed")
            ? "success"
            : "info";
        pushToast(item.message, tone);
      }
    }

    setPartial((prev) => ({
      ...prev,
      bootstrapLoading: false,
      statusLoading: false,
      error: "",
      status,
      news,
      logs,
      runtime,
      events,
      language: prev.language || runtime.defaultLanguage || status.language || "te",
      promptInput: prev.promptInput,
    }));
  }

  async function refreshDashboard({ silent = false } = {}) {
    setPartial((prev) => ({ ...prev, bootstrapLoading: silent ? prev.bootstrapLoading : true, statusLoading: silent, error: silent ? prev.error : "" }));
    try {
      const payload = await fetchDashboardState();
      applySnapshot(payload);
    } catch (error) {
      setPartial((prev) => ({
        ...prev,
        bootstrapLoading: false,
        statusLoading: false,
        error: error.message || "Could not load dashboard data.",
      }));
    }
  }

  async function runAction(key, task, successMessage = "") {
    setPartial((prev) => ({
      ...prev,
      actionState: { ...prev.actionState, [key]: true },
      error: "",
    }));
    try {
      await task();
      if (successMessage) {
        pushToast(successMessage, "success");
      }
      await refreshDashboard({ silent: true });
    } catch (error) {
      pushToast(error.message || "Action failed.", "error");
      setPartial((prev) => ({ ...prev, error: error.message || "Action failed." }));
    } finally {
      setPartial((prev) => ({
        ...prev,
        actionState: { ...prev.actionState, [key]: false },
      }));
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void refreshDashboard();

    const source = new EventSource("/events");
    source.addEventListener("snapshot", (event) => {
      try {
        applySnapshot(JSON.parse(event.data));
      } catch {
        // ignore malformed SSE frames
      }
    });
    source.onerror = () => {
      // keep browser retry behavior
    };

    return () => {
      mountedRef.current = false;
      source.close();
    };
  }, []);

  return useMemo(() => {
    const metrics = {
      newsCount: state.news.length,
      videoCount: state.status?.previewItems?.length || 0,
      uploadCount: state.status?.youtubeLinks?.length || 0,
      logCount: state.logs.length,
    };

    return {
      ...state,
      metrics,
      setLanguage: (language) => setState((prev) => ({ ...prev, language })),
      setPromptInput: (promptInput) => setState((prev) => ({ ...prev, promptInput })),
      dismissToast: (id) => setState((prev) => ({ ...prev, toasts: prev.toasts.filter((item) => item.id !== id) })),
      refreshStatus: () => refreshDashboard({ silent: true }),
      runNow: () =>
        runAction("auto", () => startAutomation({ language: state.language, mode: "full", prompt: state.promptInput }), "Automation started."),
      runShort: () =>
        runAction("short", () => startAutomation({ language: state.language, mode: "short", prompt: state.promptInput }), "Short video run started."),
      runLong: () =>
        runAction("long", () => startAutomation({ language: state.language, mode: "long", prompt: state.promptInput }), "Long video run started."),
      generateAutoPrompt: () =>
        runAction("prompt", async () => {
          const payload = await generatePrompt({
            topic: state.promptInput || state.status?.selectedTopic || state.news?.[0]?.title || "",
            language: state.language,
            mode: state.runtime?.defaultMode || "full",
          });
          setPartial((prev) => ({ ...prev, generatedPrompt: payload.prompt, promptInput: payload.topic }));
        }),
      saveRuntimeSettings: (payload) =>
        runAction("saveSettings", async () => {
          const runtime = await updateRuntimeSettings(payload);
          setPartial((prev) => ({ ...prev, runtime: normalizeRuntime(runtime), language: runtime.default_language || prev.language }));
        }, "Settings saved."),
      sendTelegramTest: () =>
        runAction("telegram", () => testTelegram("Test alert from AI YouTube Automation dashboard"), "Telegram test sent."),
      askAi: (payload) =>
        runAction("prompt", async () => {
          const result = await askSportsAi({ ...payload, language: state.language });
          setPartial((prev) => ({ ...prev, askAiResult: result }));
        }),
    };
  }, [state]);
}
