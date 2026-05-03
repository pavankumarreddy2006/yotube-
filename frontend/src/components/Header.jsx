import { Activity, Clock3, RefreshCw, Sparkles } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import StatusPill from "./StatusPill";

export default function Header({ status, refreshing, liveRefresh, setLiveRefresh, onRefresh }) {
  const active = status?.running && !status?.failed;

  return (
    <header className="panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-glow">
            <Sparkles className="h-7 w-7 text-highlight" />
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Telugu Sports Automation Web Application
              </h1>
              <StatusPill status={status?.status || "Idle"} active={active} />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Real-time control center for your automated Telugu sports channel, with live decisions,
              content visibility, and recovery actions in one place.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[410px]">
          <InfoChip icon={Activity} label="Current Task" value={status?.currentTask || "Waiting for next run"} />
          <InfoChip icon={Clock3} label="Last Run" value={formatTimestamp(status?.lastRunTime)} />
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
          >
            <div className="mb-1 flex items-center gap-2 text-sm text-slate-300">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{refreshing ? "Syncing..." : "Manual refresh"}</span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                Live
                <input
                  type="checkbox"
                  checked={liveRefresh}
                  onChange={(event) => setLiveRefresh(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                />
              </label>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-sm text-slate-300">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
