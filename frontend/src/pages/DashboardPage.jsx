import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flame,
  ImagePlus,
  LoaderCircle,
  MicVocal,
  PlayCircle,
  Rocket,
  TrendingUp,
  UploadCloud,
  Video,
  WandSparkles,
} from "lucide-react";
import { NewsList } from "../components/NewsList";
import { LogsPanel } from "../components/LogsPanel";
import { SectionCard } from "../components/SectionCard";

const pipelineStages = [
  { key: "script", label: "Script" },
  { key: "voice", label: "Voice" },
  { key: "images", label: "Images" },
  { key: "video", label: "Video" },
  { key: "upload", label: "Upload" },
];

const actionCards = [
  {
    key: "run",
    title: "Generate & Upload Video",
    description: "Run the full end-to-end pipeline with one click and watch each stage update live.",
    icon: Rocket,
  },
  {
    key: "scripts",
    title: "Create Telugu Script",
    description: "Turn a fresh sports topic into a structured Telugu narration and prompt set.",
    icon: WandSparkles,
  },
  {
    key: "voice",
    title: "Generate Voice",
    description: "Review narration progress and keep voice generation quality visible in the workflow.",
    icon: MicVocal,
  },
  {
    key: "images",
    title: "Generate Images",
    description: "Open media tools and verify visual assets before the render stage starts.",
    icon: ImagePlus,
  },
];

export default function DashboardPage({ dashboard, onNavigate }) {
  const { status, language, loading, statusLoading, actionState, runNow, metrics, news, logs } = dashboard;
  const completion = getCompletion(status);
  const statusTone = getStatusTone(status);
  const uploadsToday = status?.youtubeLinks?.length || 0;
  const previewItems = status?.previewItems || [];
  const lastUploadTime = status?.lastRunTimeLabel || "Not yet uploaded";
  const stageStates = getStageStates(status);
  const trendingTopic = status?.selectedTopic || news[0]?.title || "No active topic";

  const metricCards = [
    {
      label: "Videos Uploaded Today",
      value: String(uploadsToday),
      icon: TrendingUp,
      detail: uploadsToday ? "Successful publishing links available" : "No uploads completed yet",
    },
    {
      label: "Average Processing Time",
      value: status?.running ? "~12 min" : status?.lastRunTimeLabel ? "~9 min" : "Pending",
      icon: Clock3,
      detail: "Estimated from the current automation pace",
    },
    {
      label: "Failed Jobs",
      value: status?.failed ? "1" : "0",
      icon: AlertTriangle,
      detail: status?.failed ? "Attention needed on the current run" : "Pipeline healthy",
    },
    {
      label: "Trending Topic",
      value: truncateText(trendingTopic, 42),
      icon: Flame,
      detail: "Current story feeding the generation flow",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-shell">
        <div className="hero-grid">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">
                  Automation Console
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  Default language: {language === "en" ? "English" : "Telugu"}
                </span>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Modern control for AI news-to-video production.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Launch the workflow, track each pipeline stage, preview generated media, and keep operations clear enough to manage in seconds.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={runNow}
                  disabled={Boolean(status?.running) || actionState.run}
                  className="start-button"
                >
                  {actionState.run ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                  <span>{actionState.run ? "Starting pipeline..." : "Start Automation"}</span>
                </button>
                <button type="button" onClick={() => onNavigate("/dashboard/videos")} className="ghost-button">
                  <PlayCircle className="h-4 w-4" />
                  <span>Open Video Preview</span>
                </button>
              </div>

              <div className="section-surface">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current stage</p>
                    <p className="mt-2 text-lg font-semibold text-white">{status?.currentTask || "Waiting for your next run"}</p>
                  </div>
                  <p className="text-sm text-slate-400">{completion}% complete</p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6)] transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pipelineStages.map((stage) => (
                    <div key={stage.key} className={getPipelinePillClass(stageStates[stage.key])}>
                      <span>{stage.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="section-surface">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Status</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{statusTone.label}</p>
                </div>
                <div className={`status-dot ${statusTone.dotClass}`} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoTile label="Current task" value={status?.currentTask || "Awaiting trigger"} />
                <InfoTile label="Progress" value={`${completion}%`} />
                <InfoTile label="Estimated time left" value={status?.running ? `${Math.max(1, 14 - Math.round(completion / 10))} min` : "Ready now"} />
                <InfoTile label="Last upload time" value={lastUploadTime} />
              </div>
            </div>

            <div className="section-surface">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pipeline visualization</p>
              <div className="mt-4 flex flex-col gap-3">
                {pipelineStages.map((stage, index) => (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div className={getNodeClass(stageStates[stage.key])}>
                      {renderStageIcon(stageStates[stage.key])}
                      <span>{stage.label}</span>
                    </div>
                    {index < pipelineStages.length - 1 ? <ArrowRight className="h-4 w-4 text-slate-500" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="metric-tile">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3">
                  <Icon className="h-5 w-5 text-cyan-200" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Live
                </span>
              </div>
              <p className="mt-5 text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          title="Quick Actions"
          description="Jump straight into the workflows you use most often."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {actionCards.map((card) => {
              const Icon = card.icon;
              const disabled = card.key === "run" ? Boolean(status?.running) || actionState.run : false;
              const handleClick =
                card.key === "run"
                  ? runNow
                  : card.key === "scripts"
                    ? () => onNavigate("/dashboard/scripts")
                    : card.key === "voice"
                      ? () => onNavigate("/dashboard/scripts")
                      : () => onNavigate("/dashboard/assets");

              return (
                <button key={card.key} type="button" onClick={handleClick} disabled={disabled} className="quick-action-card">
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3">
                        <Icon className="h-5 w-5 text-cyan-200" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Video Preview"
          description="Review the latest render output and upload state without leaving the dashboard."
          actions={
            <button type="button" onClick={() => onNavigate("/dashboard/videos")} className="ghost-button">
              Open manager
            </button>
          }
        >
          {previewItems.length ? (
            <div className="space-y-4">
              {previewItems.slice(0, 2).map((item, index) => (
                <div key={`${item.url}-${index}`} className="video-item">
                  <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/50 md:w-[240px]">
                    {item.url ? (
                      <video src={item.url} controls preload="metadata" className="aspect-video h-full w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center">
                        <Video className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusChip state={status?.failed ? "failed" : status?.running ? "processing" : "uploaded"} />
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">
                        {item.variant === "long" ? "Long format" : "Short format"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{item.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.variant === "long" ? "Detailed version for deeper storytelling." : "Hook-focused preview optimized for fast engagement."}
                    </p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
                      Open preview
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No generated previews yet. Start automation to render your first draft video.</div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Live News Feed"
          description="Fresh stories feeding the current dashboard queue."
          actions={
            <button type="button" onClick={() => onNavigate("/dashboard/news")} className="ghost-button">
              View all
            </button>
          }
        >
          <NewsList items={news.slice(0, 3)} loading={loading.news && !news.length} compact />
        </SectionCard>

        <SectionCard
          title="Live Logs"
          description="Recent pipeline activity with realtime operational visibility."
          actions={
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              {statusLoading ? "Refreshing" : "Streaming"}
            </div>
          }
        >
          <LogsPanel logs={logs.slice(-12)} />
        </SectionCard>
      </section>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function StatusChip({ state }) {
  const styles = {
    processing: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    uploaded: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  };

  return <span className={`rounded-full border px-3 py-1 ${styles[state]}`}>{state === "processing" ? "Processing" : state === "uploaded" ? "Uploaded" : "Failed"}</span>;
}

function getCompletion(status) {
  if (status?.failed) {
    return 82;
  }
  if (status?.status === "completed") {
    return 100;
  }
  if (!status?.running) {
    return status?.previewItems?.length ? 100 : 0;
  }

  const stage = String(status?.currentStage || status?.progressLabel || "").toLowerCase();
  if (stage.includes("upload")) {
    return 88;
  }
  if (stage.includes("video")) {
    return 72;
  }
  if (stage.includes("image")) {
    return 54;
  }
  if (stage.includes("voice")) {
    return 36;
  }
  if (stage.includes("script")) {
    return 18;
  }
  return 12;
}

function getStageStates(status) {
  const completion = getCompletion(status);
  const failed = Boolean(status?.failed);

  return {
    script: completion >= 18 ? "completed" : "idle",
    voice: completion >= 36 ? "completed" : completion >= 18 && status?.running ? "running" : "idle",
    images: completion >= 54 ? "completed" : completion >= 36 && status?.running ? "running" : "idle",
    video: failed ? "failed" : completion >= 72 ? "completed" : completion >= 54 && status?.running ? "running" : "idle",
    upload: failed ? "failed" : completion >= 88 ? (status?.running ? "running" : completion === 100 ? "completed" : "running") : "idle",
  };
}

function getStatusTone(status) {
  if (status?.failed) {
    return { label: "Error", dotClass: "status-dot--failed" };
  }
  if (status?.running) {
    return { label: "Live", dotClass: "status-dot--running" };
  }
  return { label: "Idle", dotClass: "status-dot--idle" };
}

function getPipelinePillClass(state) {
  const base = "rounded-full border px-3 py-1 text-xs font-medium";
  if (state === "completed") {
    return `${base} border-emerald-400/20 bg-emerald-500/10 text-emerald-200`;
  }
  if (state === "running") {
    return `${base} border-amber-400/20 bg-amber-500/10 text-amber-200`;
  }
  if (state === "failed") {
    return `${base} border-rose-400/20 bg-rose-500/10 text-rose-200`;
  }
  return `${base} border-white/10 bg-white/[0.04] text-slate-400`;
}

function getNodeClass(state) {
  if (state === "completed") {
    return "pipeline-node border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }
  if (state === "running") {
    return "pipeline-node border-amber-400/20 bg-amber-500/10 text-amber-200";
  }
  if (state === "failed") {
    return "pipeline-node border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
  return "pipeline-node border-white/10 bg-white/[0.04] text-slate-400";
}

function renderStageIcon(state) {
  if (state === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  if (state === "running") {
    return <LoaderCircle className="h-4 w-4 animate-spin" />;
  }
  if (state === "failed") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  return <UploadCloud className="h-4 w-4" />;
}

function truncateText(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}
