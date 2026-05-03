import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConfig,
  fetchContent,
  fetchDecision,
  fetchLogs,
  fetchNews,
  fetchStatus,
  generateAiScript,
  retryFailedTask,
  triggerRun,
  uploadAgain
} from "../lib/api";
import { normalizeContent, normalizeDecision, normalizeLogs, normalizeNews, normalizeStatus } from "../lib/formatters";

const REFRESH_INTERVAL = 8000;

const initialState = {
  config: null,
  status: null,
  news: [],
  decision: null,
  content: null,
  logs: [],
  loading: true,
  refreshing: false,
  error: "",
  language: "te",
  actionState: {
    run: false,
    retry: false,
    upload: false,
    askAi: false
  },
  askAiResult: null
};

export function useDashboardData() {
  const [state, setState] = useState(initialState);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const mounted = useRef(true);

  async function loadData({ silent = false } = {}) {
    if (!mounted.current) {
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: silent ? prev.loading : true,
      refreshing: silent,
      error: silent ? prev.error : ""
    }));

    try {
      const [configData, statusData, newsData, decisionData, contentData, logsData] = await Promise.all([
        fetchConfig(),
        fetchStatus(),
        fetchNews(),
        fetchDecision(),
        fetchContent(),
        fetchLogs()
      ]);

      if (!mounted.current) {
        return;
      }

      const normalizedStatus = normalizeStatus(statusData);
      setState((prev) => ({
        ...prev,
        config: configData,
        status: normalizedStatus,
        news: normalizeNews(newsData),
        decision: normalizeDecision(decisionData),
        content: normalizeContent(contentData),
        logs: normalizeLogs(logsData),
        language: prev.language || configData?.default_language || normalizedStatus.language || "te",
        loading: false,
        refreshing: false,
        error: ""
      }));
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error?.response?.data?.detail || error?.message || "Dashboard data could not be loaded."
      }));
    }
  }

  async function handleAction(key, action) {
    setState((prev) => ({
      ...prev,
      actionState: { ...prev.actionState, [key]: true }
    }));

    try {
      await action();
      await loadData({ silent: true });
    } finally {
      if (!mounted.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        actionState: { ...prev.actionState, [key]: false }
      }));
    }
  }

  useEffect(() => {
    mounted.current = true;
    loadData();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!liveRefresh) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      loadData({ silent: true });
    }, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [liveRefresh]);

  return useMemo(
    () => ({
      ...state,
      liveRefresh,
      setLiveRefresh,
      setLanguage: (language) => setState((prev) => ({ ...prev, language })),
      refreshNow: () => loadData({ silent: true }),
      runNow: () => handleAction("run", () => triggerRun(state.language)),
      retryNow: () => handleAction("retry", () => retryFailedTask(state.language)),
      uploadNow: () => handleAction("upload", uploadAgain),
      askAi: (payload) =>
        handleAction("askAi", async () => {
          const result = await generateAiScript({ ...payload, language: state.language });
          if (!mounted.current) {
            return;
          }
          setState((prev) => ({ ...prev, askAiResult: result }));
        })
    }),
    [liveRefresh, state]
  );
}
