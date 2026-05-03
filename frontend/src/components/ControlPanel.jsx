import { CloudUpload, Languages, Play, RotateCcw, Stars, Zap } from "lucide-react";

export default function ControlPanel({
  onRun,
  onRetry,
  onUpload,
  actionState,
  status,
  language,
  setLanguage,
  languages
}) {
  const running = Boolean(status?.running);

  return (
    <section className="hero-panel">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-200">
            <Stars className="h-3.5 w-3.5" />
            AI Video Pipeline
          </div>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            AI Sports Automation
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Generate, create, and upload sports videos automatically with a single workflow that tracks live stories,
            scores topics, writes scripts, and publishes content.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRun}
              disabled={running || actionState.run}
              className="hero-cta disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Play className={`h-5 w-5 ${running || actionState.run ? "animate-pulse" : ""}`} />
              <span>{running || actionState.run ? "Launching automation..." : "START AUTOMATION"}</span>
            </button>

            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <Zap className="h-4 w-4 text-cyan-300" />
              <span>{status?.currentTask || "Ready for the next sports cycle"}</span>
            </div>
          </div>
        </div>

        <div className="glass-card w-full max-w-md space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <Languages className="h-4 w-4 text-cyan-300" />
              Content Language
            </div>
            <div className="select-wrap">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={running}
                className="dashboard-select"
              >
                {languages.map((item) => (
                  <option key={item.value} value={item.value} className="bg-slate-950 text-white">
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Choose between Telugu and English for generated scripts and voice output.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={running || actionState.retry}
              className="action-btn-secondary h-12 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className={`h-4 w-4 ${actionState.retry ? "animate-spin" : ""}`} />
              {actionState.retry ? "Retrying..." : "Retry"}
            </button>
            <button
              type="button"
              onClick={onUpload}
              disabled={running || actionState.upload}
              className="action-btn-secondary h-12 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CloudUpload className={`h-4 w-4 ${actionState.upload ? "animate-bounce" : ""}`} />
              {actionState.upload ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
