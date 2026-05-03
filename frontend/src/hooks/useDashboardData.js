import { useEffect, useMemo, useRef, useState } from "react";
import { askSportsAi, fetchLogs, fetchNews, fetchStatus, startAutomation } from "../lib/api";
import { normalizeLogs, normalizeNews, normalizeStatus } from "../lib/formatters";

const STATUS_REFRESH_INTERVAL = 3000;
const NEWS_REFRESH_INTERVAL = 15 * 60 * 1000;

const initialState = {
  loading: true,
  error: "",
  status: null,
  news: [],
  logs: [],
  language: "te",
  languageTouched: false,
  askAiResult: null,
  actionState: {
    run: false,
    askAi: false,
  },
};

export function useDashboardData() {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  async function loadStatusAndLogs({ silent = false } = {}) {
    if (!mountedRef.current) {
      return;
    }

    if (!silent) {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
    }

    try {
      const [statusPayload, logsPayload] = await Promise.all([fetchStatus(), fetchLogs()]);
      if (!mountedRef.current) {
        return;
      }

      const status = normalizeStatus(statusPayload);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "",
        status,
        logs: normalizeLogs(logsPayload),
        language: prev.languageTouched ? prev.language : status.language || prev.language,
      }));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.response?.data?.detail || error?.message || "Could not load dashboard status.",
      }));
    }
  }

  async function loadNews({ silent = false } = {}) {
    if (!mountedRef.current) {
      return;
    }

    try {
      const newsPayload = await fetchNews();
      if (!mountedRef.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        news: normalizeNews(newsPayload),
        loading: silent ? prev.loading : false,
      }));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: prev.error || error?.response?.data?.detail || error?.message || "Could not load sports news.",
      }));
    }
  }

  async function runAction(key, action) {
    setState((prev) => ({
      ...prev,
      actionState: { ...prev.actionState, [key]: true },
      error: "",
    }));

    try {
      await action();
      await loadStatusAndLogs({ silent: true });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        error: error?.response?.data?.detail || error?.message || "Action failed.",
      }));
    } finally {
      if (!mountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        actionState: { ...prev.actionState, [key]: false },
      }));
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void Promise.all([loadStatusAndLogs(), loadNews()]);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadStatusAndLogs({ silent: true });
    }, STATUS_REFRESH_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNews({ silent: true });
    }, NEWS_REFRESH_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

  return useMemo(
    () => ({
      ...state,
      setLanguage: (language) => setState((prev) => ({ ...prev, language, languageTouched: true })),
      runNow: () => runAction("run", () => startAutomation(state.language)),
      askAi: (payload) =>
        runAction("askAi", async () => {
          const result = await askSportsAi({ ...payload, language: state.language });
          if (!mountedRef.current) {
            return;
          }
          setState((prev) => ({ ...prev, askAiResult: result }));
        }),
    }),
    [state]
  );
}
