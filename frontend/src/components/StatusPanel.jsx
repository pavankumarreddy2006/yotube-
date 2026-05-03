import { CheckCircle2, Globe2, LoaderCircle, Siren, TimerReset } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";

export default function StatusPanel({ status }) {
  const items = [
    {
      label: "System State",
      value: status?.status || "Unavailable",
      icon: status?.failed ? Siren : status?.running ? LoaderCircle : CheckCircle2,
      tone: status?.failed ? "text-danger" : status?.running ? "text-accent" : "text-success"
    },
    {
      label: "Current Stage",
      value: status?.progressLabel || "Idle",
      icon: LoaderCircle,
      tone: "text-slate-200"
    },
    {
      label: "Active Language",
      value: status?.languageLabel || "Telugu",
      icon: Globe2,
      tone: "text-slate-200"
    },
    {
      label: "Last Execution",
      value: formatTimestamp(status?.lastRunTime),
      icon: TimerReset,
      tone: "text-slate-200"
    }
  ];

  return (
    <Card title="Status Panel" subtitle="Live automation state, execution phase, and latest run context.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className={`mb-3 inline-flex rounded-2xl bg-white/5 p-2 ${item.tone}`}>
                <Icon className={`h-5 w-5 ${item.label === "System State" && status?.running ? "animate-spin" : ""}`} />
              </div>
              <p className="subtle">{item.label}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="subtle">Current Task</p>
        <p className="mt-2 text-sm leading-6 text-white">{status?.currentTask || "No active task"}</p>
        {status?.selectedTopic ? (
          <>
            <p className="subtle mt-4">Latest Selected Topic</p>
            <p className="mt-2 text-sm font-medium leading-6 text-white">{status.selectedTopic}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{status.selectedTopicSummary || "Summary unavailable."}</p>
          </>
        ) : null}
      </div>
    </Card>
  );
}
