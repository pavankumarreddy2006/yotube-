import { CheckCircle2, LoaderCircle, Siren, TimerReset } from "lucide-react";
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
      label: "Last Execution",
      value: formatTimestamp(status?.lastRunTime),
      icon: TimerReset,
      tone: "text-slate-200"
    },
    {
      label: "Current Task",
      value: status?.currentTask || "No active task",
      icon: LoaderCircle,
      tone: "text-slate-200"
    }
  ];

  return (
    <Card title="Status Panel" subtitle="Live system health and pipeline progression.">
      <div className="grid gap-4 sm:grid-cols-3">
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
    </Card>
  );
}
