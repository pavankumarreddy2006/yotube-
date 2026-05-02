export default function LoadingScreen() {
  return (
    <div className="panel flex min-h-[55vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex gap-2">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
        <span className="h-3 w-3 animate-pulse rounded-full bg-highlight [animation-delay:200ms]" />
        <span className="h-3 w-3 animate-pulse rounded-full bg-white [animation-delay:400ms]" />
      </div>
      <div>
        <p className="font-display text-xl font-semibold text-white">Loading dashboard</p>
        <p className="mt-2 text-sm text-slate-400">
          Pulling system status, content output, and logs from the automation backend.
        </p>
      </div>
    </div>
  );
}
