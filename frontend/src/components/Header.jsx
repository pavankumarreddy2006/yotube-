import { Activity, Bell, RefreshCw, Sparkles, Wifi } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";

function AppStatus({ status }) {
  const tone =
    status === "Running"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "Failed"
        ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
        : "border-slate-400/20 bg-slate-400/10 text-slate-200";

  const dotTone = status === "Running" ? "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.9)]" : status === "Failed" ? "bg-rose-400" : "bg-slate-300";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${tone}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dotTone}`} />
      <span>{status}</span>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        checked ? "bg-cyan-400/80" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

export default function Header({ status, refreshing, liveRefresh, setLiveRefresh, onRefresh, config }) {
  const headerStatus = status?.failed ? "Error" : status?.running ? "Running" : "Idle";

  return (
    <header className="panel-surface overflow-hidden px-4 py-4 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#3b82f6,#22c55e)] shadow-[0_18px_45px_rgba(37,99,235,0.28)]">
            <Sparkles className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sports Content Control Center</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">AI Sports Automation Studio</h1>
              <AppStatus status={headerStatus} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="info-chip">
            <div className="info-chip-label">
              <Activity className="h-4 w-4" />
              Pipeline
            </div>
            <div className="info-chip-value">{status?.currentTask || "Waiting for the next automation cycle"}</div>
            <div className="mt-1 text-xs text-slate-500">Last run: {formatTimestamp(status?.lastRunTime)}</div>
          </div>

          <div className="info-chip">
            <div className="info-chip-label">
              <Wifi className="h-4 w-4" />
              Auto Refresh
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-white">{liveRefresh ? "Live" : "Paused"}</span>
              <Toggle checked={liveRefresh} onChange={setLiveRefresh} />
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="info-chip text-left transition hover:border-cyan-300/20 hover:bg-white/10"
          >
            <div className="info-chip-label">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Sync
            </div>
            <div className="info-chip-value">{refreshing ? "Refreshing..." : "Refresh dashboard"}</div>
            <div className="mt-1 text-xs text-slate-400">
              Daily run: {config?.daily_runner_enabled ? config?.daily_run_time : "Disabled"}
            </div>
          </button>

          <div className="info-chip">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="info-chip-label">Alerts</div>
                <div className="info-chip-value">{status?.notifications?.length || 0} active notices</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">
                <Bell className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
