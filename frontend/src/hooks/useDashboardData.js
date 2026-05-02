import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchContent,
  fetchDecision,
  fetchLogs,
  fetchNews,
  fetchStatus,
  retryFailedTask,
  triggerRun,
  uploadAgain
} from "../lib/api";
import {
  normalizeContent,
  normalizeDecision,
  normalizeLogs,
  normalizeNews,
  normalizeStatus
} from "../lib/formatters";

const REFRESH_INTERVAL = 8000;

const initialState = {
  status: null,
  news: [],
  decision: null,
  content: null,
  logs: [],
  loading: true,
  refreshing: false,
  error: "",
  actionState: {
    run: false,
    retry: false,
    upload: false
  }
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
      const [statusData, newsData, decisionData, contentData, logsData] = await Promise.all([
        fetchStatus(),
        fetchNews(),
        fetchDecision(),
        fetchContent(),
        fetchLogs()
      ]);

      if (!mounted.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        status: normalizeStatus(statusData),
        news: normalizeNews(newsData),
        decision: normalizeDecision(decisionData),
        content: normalizeContent(contentData),
        logs: normalizeLogs(logsData),
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
        error: error?.response?.data?.message || error?.message || "Dashboard data could not be loaded."
      }));
    }
  }

  async function handleAction(key, action) {
    setState((prev) => ({
      ...prev,
      actionState: {
        ...prev.actionState,
        [key]: true
      }
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
        actionState: {
          ...prev.actionState,
          [key]: false
        }
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
      refreshNow: () => loadData({ silent: true }),
      runNow: () => handleAction("run", triggerRun),
      retryNow: () => handleAction("retry", retryFailedTask),
      uploadNow: () => handleAction("upload", uploadAgain)
    }),
    [liveRefresh, state]
  );
}
