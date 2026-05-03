import { useEffect, useMemo, useRef, useState } from "react";
import { askSportsAi, fetchConfig, fetchLogs, fetchNews, fetchStatus, startAutomation } from "../lib/api";
import { normalizeConfig, normalizeLogs, normalizeNews, normalizeStatus } from "../lib/formatters";

const STATUS_REFRESH_INTERVAL = 3000;
const NEWS_REFRESH_INTERVAL = 10 * 60 * 1000;

const initialState = {
  bootstrapLoading: true,
  configLoading: true,
  loading: {
    news: true,
  },
  refreshState: {
    news: false,
    logs: false,
  },
  error: "",
  status: null,
  news: [],
  logs: [],
  config: null,
  language: "te",
  languageTouched: false,
  askAiResult: null,
  actionState: {
    run: false,
    askAi: false,
  },
  statusLoading: false,
};

export function useDashboardData() {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  function setPartial(updater) {
    if (!mountedRef.current) {
      return;
    }
    setState(updater);
  }

  async function loadStatusAndLogs({ background = false } = {}) {
    setPartial((prev) => ({ ...prev, statusLoading: background, bootstrapLoading: background ? prev.bootstrapLoading : true, error: background ? prev.error : "" }));

    try {
      const [statusPayload, logsPayload] = await Promise.all([fetchStatus(), fetchLogs()]);
      const status = normalizeStatus(statusPayload);
      const logs = normalizeLogs(logsPayload);
      setPartial((prev) => ({
        ...prev,
        bootstrapLoading: false,
        statusLoading: false,
        status,
        logs,
        language: prev.languageTouched ? prev.language : status.language || prev.language,
      }));
    } catch (error) {
      setPartial((prev) => ({
        ...prev,
        bootstrapLoading: false,
        statusLoading: false,
        error: error.message || "Could not load dashboard status.",
      }));
    }
  }

  async function loadNews({ background = false } = {}) {
    setPartial((prev) => ({
      ...prev,
      loading: { ...prev.loading, news: background ? prev.loading.news : true },
      refreshState: { ...prev.refreshState, news: background },
    }));

    try {
      const payload = await fetchNews();
      setPartial((prev) => ({
        ...prev,
        news: normalizeNews(payload),
        loading: { ...prev.loading, news: false },
        refreshState: { ...prev.refreshState, news: false },
      }));
    } catch (error) {
      setPartial((prev) => ({
        ...prev,
        loading: { ...prev.loading, news: false },
        refreshState: { ...prev.refreshState, news: false },
        error: prev.error || error.message || "Could not load sports news.",
      }));
    }
  }

  async function loadConfig() {
    try {
      const payload = await fetchConfig();
      setPartial((prev) => ({ ...prev, config: normalizeConfig(payload), configLoading: false }));
    } catch {
      setPartial((prev) => ({ ...prev, configLoading: false }));
    }
  }

  async function refreshLogs() {
    setPartial((prev) => ({ ...prev, refreshState: { ...prev.refreshState, logs: true } }));
    try {
      const payload = await fetchLogs();
      setPartial((prev) => ({ ...prev, logs: normalizeLogs(payload), refreshState: { ...prev.refreshState, logs: false } }));
    } catch (error) {
      setPartial((prev) => ({ ...prev, refreshState: { ...prev.refreshState, logs: false }, error: error.message || "Could not refresh logs." }));
    }
  }

  async function runAction(key, action) {
    setPartial((prev) => ({
      ...prev,
      actionState: { ...prev.actionState, [key]: true },
      error: "",
    }));

    try {
      await action();
      await loadStatusAndLogs({ background: true });
    } catch (error) {
      setPartial((prev) => ({
        ...prev,
        error: error.message || "Action failed.",
      }));
    } finally {
      setPartial((prev) => ({
        ...prev,
        actionState: { ...prev.actionState, [key]: false },
      }));
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void Promise.all([loadStatusAndLogs(), loadNews(), loadConfig()]);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadStatusAndLogs({ background: true });
    }, STATUS_REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNews({ background: true });
    }, NEWS_REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
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
      setLanguage: (language) => setState((prev) => ({ ...prev, language, languageTouched: true })),
      runNow: () => runAction("run", () => startAutomation(state.language)),
      askAi: (payload) =>
        runAction("askAi", async () => {
          const result = await askSportsAi({ ...payload, language: state.language });
          setPartial((prev) => ({ ...prev, askAiResult: result }));
        }),
      refreshNews: () => loadNews({ background: true }),
      refreshLogs,
    };
  }, [state]);
}
