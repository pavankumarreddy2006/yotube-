export function StatusBadge({ status }) {
  const failed = Boolean(status?.failed);
  const running = Boolean(status?.running);
  const completed = status?.status === "completed";
  const label = failed ? "Error" : running ? "Live" : completed ? "Completed" : "Idle";

  return (
    <div className="glass-pill justify-between min-w-[150px]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p>
        <p className="mt-1 text-sm text-white">{label}</p>
      </div>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
          failed
            ? "bg-rose-500/18 text-rose-200"
            : running
              ? "bg-amber-500/18 text-amber-200"
              : completed
                ? "bg-emerald-500/18 text-emerald-200"
                : "bg-slate-500/18 text-slate-200"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            failed
              ? "bg-rose-400"
              : running
                ? "bg-amber-300"
                : completed
                  ? "bg-emerald-300"
                  : "bg-slate-300"
          }`}
        />
        {label}
      </span>
    </div>
  );
}
