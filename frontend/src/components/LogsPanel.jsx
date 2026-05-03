import { useEffect, useRef } from "react";

const tone = {
  info: "text-slate-200",
  success: "text-emerald-300",
  error: "text-rose-300",
};

export function LogsPanel({ logs, autoScroll = true, heightClass = "max-h-[420px]" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!autoScroll || !containerRef.current) {
      return;
    }
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs, autoScroll]);

  return (
    <div ref={containerRef} className={`terminal-panel ${heightClass}`}>
      {logs.length ? (
        logs.map((log) => (
          <div key={log.id} className="grid gap-3 border-b border-white/5 py-2 md:grid-cols-[120px_88px_1fr]">
            <span className="font-mono text-xs text-slate-500">{log.timestampLabel}</span>
            <span className={`font-mono text-sm uppercase ${tone[log.level] || tone.info}`}>{log.level}</span>
            <p className="font-mono text-sm text-slate-200">{log.message}</p>
          </div>
        ))
      ) : (
        <p className="font-mono text-sm text-slate-400">Waiting for pipeline activity...</p>
      )}
    </div>
  );
}
