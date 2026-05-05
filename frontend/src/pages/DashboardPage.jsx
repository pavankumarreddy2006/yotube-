import { ArrowRight, CheckCircle2, LoaderCircle, Rocket, Sparkles, Video, Wand2 } from "lucide-react";
import { NewsList } from "../components/NewsList";
import { LogsPanel } from "../components/LogsPanel";
import { SectionCard } from "../components/SectionCard";

const stats = [
  { key: "newsCount", label: "News Stories" },
  { key: "videoCount", label: "Video Assets" },
  { key: "uploadCount", label: "YouTube Links" },
  { key: "logCount", label: "Log Events" },
];

export default function DashboardPage({ dashboard, onNavigate }) {
  const { status, language, loading, statusLoading, actionState, runNow, metrics, news, logs, error } = dashboard;

  return (
    <div className="space-y-6">
      <section className="glass-card overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="hero-grid p-6">
            <div className="flex flex-col justify-center">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Automation Dashboard</p>
              <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
                Run the full AI sports pipeline with live visibility.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Start the backend workflow, track every stage, and move from live sports headlines to publishable videos from one responsive control room.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={runNow}
                  disabled={Boolean(status?.running) || actionState.run}
                  className="start-button"
                >
                  {actionState.run ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                  <span>{actionState.run ? "Starting..." : "Start Automation"}</span>
                </button>
                <button type="button" onClick={() => onNavigate("/dashboard/scripts")} className="ghost-button">
                  <Sparkles className="h-4 w-4" />
                  <span>Open Script Generator</span>
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Kpi label="Language" value={language === "en" ? "English" : "Telugu"} />
                <Kpi label="Current Task" value={status?.currentTask || "Waiting for next run"} />
                <Kpi label="Selected Topic" value={status?.selectedTopic || "No topic selected"} />
              </div>
              {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            </div>

            <div className="glass-card flex min-h-[260px] flex-col justify-between border border-white/10 bg-slate-950/20 p-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">System Status</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className={`status-dot ${status?.failed ? "status-dot--failed" : status?.running ? "status-dot--running" : "status-dot--idle"}`} />
                  <div>
                    <p className="text-3xl font-semibold text-white">{status?.failed ? "Failed" : status?.running ? "Running" : "Idle"}</p>
                    <p className="mt-1 text-sm text-slate-400">{status?.progressLabel || "Waiting for next run"}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-6 text-slate-300">{status?.selectedTopicSummary || "The next selected sports story summary will appear here."}</p>
              </div>
              <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Background sync</p>
                <p className="mt-2 text-lg font-medium text-white">{statusLoading ? "Polling live pipeline status..." : "Status, logs, and news are live."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.key} className="metric-tile">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{metrics[item.key]}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="feature-card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/12 p-3">
              <Wand2 className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Simple Daily Workflow</h3>
              <p className="mt-1 text-sm text-slate-400">Built to be easy even when you are checking videos quickly.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <WorkflowStep title="1. Run" text="Start the pipeline and let the system fetch news, script, voice, and previews." />
            <WorkflowStep title="2. Review" text="Check the preview page, logs, and thumbnail before publishing." />
            <WorkflowStep title="3. Improve" text="Use each run to refine hooks, visuals, and Shorts structure for tomorrow." />
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Quick Actions</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Most-used controls</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ActionTile label="Start full run" description="Generate Telugu assets end to end." onClick={runNow} disabled={Boolean(status?.running) || actionState.run} />
            <ActionTile label="Open scripts" description="Review and refine generated narration." onClick={() => onNavigate("/dashboard/scripts")} />
            <ActionTile label="Check videos" description="Preview Shorts and full-length exports." onClick={() => onNavigate("/dashboard/videos")} />
            <ActionTile label="Live news" description="Inspect what stories are feeding the pipeline." onClick={() => onNavigate("/dashboard/news")} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Live Sports News"
          description="Fresh stories from the latest generated content payload."
          actions={
            <button type="button" onClick={() => onNavigate("/dashboard/news")} className="ghost-button">
              View all news
            </button>
          }
        >
          <NewsList items={news.slice(0, 3)} loading={loading.news && !news.length} compact />
        </SectionCard>

        <SectionCard
          title="Video Pipeline"
          description="Latest generated previews and upload state."
          actions={
            <button type="button" onClick={() => onNavigate("/dashboard/videos")} className="ghost-button">
              Open video manager
            </button>
          }
        >
          <div className="space-y-4">
            {status?.previewItems?.length ? (
              status.previewItems.map((item, index) => (
                <div key={`${item.url}-${index}`} className="video-item">
                  {status?.thumbnailUrl ? (
                    <img src={status.thumbnailUrl} alt={item.label} className="h-24 w-32 rounded-2xl object-cover" />
                  ) : (
                    <div className="news-image-fallback">
                      <Video className="h-6 w-6 text-cyan-200" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-white">{item.label}</h3>
                    <p className="mt-2 text-sm text-slate-400">{item.variant === "long" ? "Long-form export" : "Short-form export"}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-cyan-300 hover:text-cyan-200">
                      Open preview
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Run the automation once to generate the first video previews.</div>
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Live Logs" description="Recent backend events streamed from the pipeline status store.">
        <LogsPanel logs={logs.slice(-16)} />
      </SectionCard>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}

function WorkflowStep({ title, text }) {
  return (
    <div className="soft-panel">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function ActionTile({ label, description, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="soft-panel text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        {disabled ? <CheckCircle2 className="h-5 w-5 text-slate-500" /> : <ArrowRight className="h-5 w-5 text-cyan-300" />}
      </div>
    </button>
  );
}
