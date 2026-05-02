import { ListFilter, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

const filters = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "warning", label: "Fix Attempts" },
  { key: "success", label: "Success" }
];

const toneMap = {
  error: "border-danger/20 bg-danger/10 text-danger",
  warning: "border-warning/20 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success"
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
      title="Logs Panel"
      subtitle="Real-time operational history with severity highlighting."
      action={
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          <ListFilter className="h-4 w-4" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="bg-transparent outline-none"
          >
            {filters.map((item) => (
              <option key={item.key} value={item.key} className="bg-panel text-white">
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
          description="Once the system starts producing logs, they will stream here automatically."
        />
      ) : (
        <div ref={containerRef} className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {filteredLogs.map((log) => (
            <div key={log.id} className={`rounded-3xl border p-4 ${toneMap[log.level] || toneMap.success}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-current/80">
                <span>{log.level}</span>
                <span>{formatTimestamp(log.timestamp)}</span>
              </div>
              <p className="text-sm leading-6 text-slate-100">{log.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
