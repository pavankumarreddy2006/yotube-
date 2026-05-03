import { CloudUpload, Languages, Play, RotateCcw } from "lucide-react";
import Card from "./Card";

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
    <Card title="Main Control" subtitle="Launch the complete newsroom-to-YouTube workflow from one place.">
      <div className="space-y-5">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,209,178,0.22),rgba(249,115,22,0.16))] p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-slate-200">Primary Automation</p>
          <h3 className="font-display text-2xl font-semibold text-white">START AUTOMATION</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Fetches the latest sports news, generates scripts, creates voice, builds long and short videos, uploads to
            YouTube, sends Telegram alerts, and updates the dashboard in real time.
          </p>
          <button
            type="button"
            onClick={onRun}
            disabled={running || actionState.run}
            className="action-btn-primary mt-5 w-full justify-center rounded-[24px] px-5 py-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-5 w-5" />
            {running || actionState.run ? "AUTOMATION RUNNING..." : "START AUTOMATION"}
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Languages className="h-4 w-4 text-highlight" />
            Script + Voice Language
          </div>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={running}
            className="w-full rounded-2xl border border-white/10 bg-shell px-4 py-3 text-white outline-none transition focus:border-accent"
          >
            {languages.map((item) => (
              <option key={item.value} value={item.value} className="bg-panel text-white">
                {item.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Voice and script follow this language. Titles, descriptions, and tags stay in English for SEO.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={running || actionState.retry}
            className="action-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {actionState.retry ? "Retrying..." : "Retry Pipeline"}
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={running || actionState.upload}
            className="action-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloudUpload className="h-4 w-4" />
            {actionState.upload ? "Uploading..." : "Upload Latest"}
          </button>
        </div>
      </div>
    </Card>
  );
}
