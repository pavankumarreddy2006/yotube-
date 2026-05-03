import { ListFilter, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

const filters = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "warning", label: "Warnings" },
  { key: "success", label: "Success" }
];

const toneMap = {
  error: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  success: "border-sky-400/20 bg-sky-400/10 text-sky-200"
};

export default function LogsPanel({ logs }) {
  const [filter, setFilter] = useState("all");
  const containerRef = useRef(null);

  const filteredLogs = useMemo(() => {
    if (filter === "all") {
      return logs;
    }
    return logs.filter((log) => log.level === filter);
  }, [filter, logs]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [filteredLogs]);

  return (
    <Card
      title="Live Logs"
      subtitle="Terminal-style stream of the automation engine."
      action={
        <div className="select-wrap max-w-[180px]">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <ListFilter className="h-4 w-4" />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="dashboard-select pl-11">
            {filters.map((item) => (
              <option key={item.key} value={item.key} className="bg-slate-950 text-white">
                {item.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={TerminalSquare}
          title="No logs to display"
          description="Once tasks start running, color-coded log events will stream into this console."
        />
      ) : (
        <div
          ref={containerRef}
          className="custom-scroll max-h-[30rem] space-y-3 overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/45 p-4"
        >
          {filteredLogs.map((log) => (
            <div key={log.id} className={`rounded-2xl border px-4 py-3 ${toneMap[log.level] || toneMap.success}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-current/80">
                <span>{log.level}</span>
                <span>{formatTimestamp(log.timestamp)}</span>
              </div>
              <p className="font-mono text-sm leading-6 text-slate-100">{log.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
