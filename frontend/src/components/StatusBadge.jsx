export function StatusBadge({ status }) {
  const failed = Boolean(status?.failed);
  const running = Boolean(status?.running);
  const completed = status?.status === "completed";
  const label = failed ? "Error" : running ? "Live" : completed ? "Completed" : "Idle";
  const toneClass = failed ? "badge-danger" : running ? "badge-warning" : completed ? "badge-success" : "badge";
  const dotClass = failed ? "status-dot-danger" : running ? "status-dot-warning" : completed ? "status-dot-success" : "status-dot-accent";

  return (
    <div className="secondary-button min-w-[150px] justify-between px-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p>
        <p className="mt-1 text-sm text-[var(--text-main)]">{label}</p>
      </div>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${toneClass}`}>
        <span className={`status-dot h-2.5 w-2.5 ${dotClass}`} />
        {label}
      </span>
    </div>
  );
}
