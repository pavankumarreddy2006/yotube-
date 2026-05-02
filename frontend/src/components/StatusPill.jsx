export default function StatusPill({ status, active }) {
  const tone = active
    ? "bg-success/15 text-success ring-success/25"
    : status?.toLowerCase() === "failed"
      ? "bg-danger/15 text-danger ring-danger/25"
      : "bg-white/8 text-slate-200 ring-white/10";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${tone}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-success shadow-[0_0_18px_rgba(34,197,94,0.85)]" : status?.toLowerCase() === "failed" ? "bg-danger" : "bg-slate-400"}`} />
      <span>{status}</span>
    </div>
  );
}
