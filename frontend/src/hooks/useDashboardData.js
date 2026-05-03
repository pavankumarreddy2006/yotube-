import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConfig,
  fetchContent,
  fetchLogs,
  fetchNews,
  fetchStatus,
  generateAiScript,
  triggerRun,
  uploadAgain
} from "../lib/api";
import { normalizeContent, normalizeLogs, normalizeNews, normalizeStatus } from "../lib/formatters";

const STATUS_REFRESH_INTERVAL = 3000;
const NEWS_REFRESH_INTERVAL = 15 * 60 * 1000;

const initialState = {
  config: null,
  status: null,
  news: [],
  content: null,
  logs: [],
  loading: true,
  refreshingStatus: false,
  refreshingNews: false,
  error: "",
  language: "te",
  actionState: {
    run: false,
    upload: false,
    askAi: false
  },
  askAiResult: null
};

export function useDashboardData() {
  const [state, setState] = useState(initialState);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const mounted = useRef(true);

  async function loadCoreData({ silent = false } = {}) {
    if (!mounted.current) {
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: silent ? prev.loading : true,
      refreshingStatus: silent,
      error: silent ? prev.error : ""
    }));

    try {
      const [configData, statusData, contentData, logsData] = await Promise.all([
        fetchConfig(),
        fetchStatus(),
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
        content: normalizeContent(contentData),
        logs: normalizeLogs(logsData),
        language:
          normalizedStatus.running || normalizedStatus.lastRunTime
            ? normalizedStatus.language
            : configData?.default_language || normalizedStatus.language || prev.language || "te",
        loading: false,
        refreshingStatus: false,
        error: ""
      }));
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        refreshingStatus: false,
        error: error?.response?.data?.detail || error?.message || "Dashboard data could not be loaded."
      }));
    }
  }

  async function loadNews({ silent = false } = {}) {
    if (!mounted.current) {
      return;
    }

    setState((prev) => ({
      ...prev,
      refreshingNews: silent
    }));

    try {
      const newsData = await fetchNews();
      if (!mounted.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        news: normalizeNews(newsData),
        refreshingNews: false
      }));
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        refreshingNews: false,
        error: prev.error || error?.response?.data?.detail || error?.message || "News feed could not be loaded."
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
      await Promise.all([loadCoreData({ silent: true }), loadNews({ silent: true })]);
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        error: error?.response?.data?.detail || error?.message || "Action failed. Please try again."
      }));
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
    void Promise.all([loadCoreData(), loadNews()]);
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!liveRefresh) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void loadCoreData({ silent: true });
    }, STATUS_REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [liveRefresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNews({ silent: true });
    }, NEWS_REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(
    () => ({
      ...state,
      liveRefresh,
      setLiveRefresh,
      setLanguage: (language) => setState((prev) => ({ ...prev, language })),
      refreshNow: () => Promise.all([loadCoreData({ silent: true }), loadNews({ silent: true })]),
      runNow: () => handleAction("run", () => triggerRun(state.language)),
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
