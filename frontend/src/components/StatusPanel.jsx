import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CloudUpload,
  LoaderCircle,
  Radio,
  TimerReset
} from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";

const stateConfig = {
  Idle: { label: "Idle", icon: CircleDashed, tone: "status-idle" },
  Running: { label: "Running", icon: LoaderCircle, tone: "status-processing" },
  Uploading: { label: "Uploading", icon: CloudUpload, tone: "status-uploading" },
  Completed: { label: "Completed", icon: CheckCircle2, tone: "status-completed" },
  Failed: { label: "Failed", icon: AlertTriangle, tone: "status-failed" }
};

export default function StatusPanel({ status }) {
  const current = stateConfig[status?.status] || stateConfig.Idle;
  const states = ["Idle", "Running", "Uploading", "Completed", "Failed"];
  const CurrentIcon = current.icon;

  return (
    <Card title="Status Panel" subtitle="Live state across your AI sports pipeline with fast operational feedback.">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {states.map((label) => {
              const config = stateConfig[label];
              const Icon = config.icon;
              const active = current.label === label;
              return (
                <div
                  key={label}
                  className={`rounded-[24px] border p-4 transition ${
                    active ? `${config.tone} shadow-[0_18px_45px_rgba(15,23,42,0.4)]` : "border-white/10 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-2 ${active ? "bg-white/10" : "bg-white/5"}`}>
                      <Icon className={`h-5 w-5 ${active && label === "Running" ? "animate-spin" : ""}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-current/70">
                        {active ? "Current State" : "Standby"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="space-y-4">
          <div className={`rounded-[28px] border p-5 ${current.tone}`}>
            <div className="mb-3 flex items-center gap-3">
              <CurrentIcon className={`h-6 w-6 ${current.label === "Running" ? "animate-spin" : ""}`} />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-current/70">Pipeline State</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{status?.status || "Idle"}</h3>
              </div>
            </div>
            <p className="text-sm leading-6 text-current/90">{status?.currentTask || "No active task running right now."}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric icon={TimerReset} label="Last Execution" value={formatTimestamp(status?.lastRunTime)} />
            <Metric icon={Radio} label="Output Language" value={status?.languageLabel || "Telugu"} />
          </div>

          {status?.selectedTopic ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected Topic</p>
              <h4 className="mt-2 text-base font-semibold text-white">{status.selectedTopic}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {status.selectedTopicSummary || "Summary unavailable for the latest selected sports story."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Icon className="h-4 w-4 text-cyan-300" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-white">{value}</p>
    </div>
  );
}
