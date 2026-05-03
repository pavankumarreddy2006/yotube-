import { Languages, LoaderCircle, Rocket, Sparkles, Zap } from "lucide-react";

export default function ControlPanel({ onRun, actionState, status, language, setLanguage, languages }) {
  const running = Boolean(status?.running);
  const loading = running || actionState.run;

  return (
    <section className="hero-panel">
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] xl:items-end">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Autonomous Sports Content Engine
          </div>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            AI Sports Automation
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Generate, create, and upload sports videos automatically with a single workflow that tracks live stories,
            scores topics, writes scripts, and publishes content.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onRun}
              disabled={loading}
              className="hero-cta disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
              <span>{loading ? "AUTOMATION RUNNING" : "START AUTOMATION"}</span>
            </button>

            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <Zap className="h-4 w-4 text-cyan-300" />
              <span>{status?.currentTask || "Ready for the next sports cycle"}</span>
            </div>
          </div>
        </div>

        <div className="glass-card w-full space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <Languages className="h-4 w-4 text-cyan-300" />
              Language Selector
            </div>
            <div className="select-wrap">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={loading}
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
              Telugu is the default, and English is ready when you need a broader audience workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Selected Language" value={language === "en" ? "English" : "Telugu"} />
            <Metric label="Automation State" value={loading ? "Running" : status?.status || "Idle"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
