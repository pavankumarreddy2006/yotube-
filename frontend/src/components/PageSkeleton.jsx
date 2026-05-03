export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-card animate-pulse p-6">
        <div className="h-8 w-56 rounded-xl bg-white/10" />
        <div className="mt-3 h-4 w-80 max-w-full rounded-xl bg-white/10" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card h-64 animate-pulse bg-white/[0.03]" />
        <div className="glass-card h-64 animate-pulse bg-white/[0.03]" />
        <div className="glass-card h-64 animate-pulse bg-white/[0.03]" />
      </div>
    </div>
  );
}
