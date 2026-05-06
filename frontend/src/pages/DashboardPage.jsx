import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  Flame,
  Globe,
  Image as ImageIcon,
  Languages,
  LoaderCircle,
  PlayCircle,
  Rocket,
  Sparkles,
  TrendingUp,
  Upload,
  WandSparkles,
  Youtube,
} from "lucide-react";
import { motion } from "framer-motion";

const sportOptions = [
  { key: "cricket", label: "Cricket", icon: Globe },
  { key: "football", label: "Football", icon: Globe },
  { key: "kabaddi", label: "Kabaddi", icon: Activity },
  { key: "all", label: "All Sports", icon: Sparkles },
];

const quickCards = [
  { label: "Generate Shorts", icon: Sparkles, action: "short" },
  { label: "Generate Long Video", icon: Clapperboard, action: "long" },
  { label: "Trending Topics", icon: Flame, action: "trending" },
  { label: "Surprise Me", icon: WandSparkles, action: "prompt" },
  { label: "Create Thumbnail", icon: ImageIcon, action: "thumbnail" },
];

export default function DashboardPage({ dashboard, currentPath }) {
  const { status, runtime } = dashboard;

  if (!status || !runtime) {
    return <div className="empty-state">Loading CreatorOS and preparing your studio...</div>;
  }

  return (
    <div className="space-y-6">
      <HeroStudio dashboard={dashboard} />
      <QuickActions dashboard={dashboard} />
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <LiveFeed dashboard={dashboard} />
        <PreviewPanel dashboard={dashboard} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <TrendsPanel dashboard={dashboard} />
        <AnalyticsPanel dashboard={dashboard} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <AutomationPanel dashboard={dashboard} />
        <LogsPanel dashboard={dashboard} currentPath={currentPath} />
      </section>
    </div>
  );
}

function HeroStudio({ dashboard }) {
  const { status, runtime, language, setLanguage, promptInput, setPromptInput, actionState, runNow, runShort, runLong, generateAutoPrompt, useSportPrompt } = dashboard;
  const voiceLabel = runtime.ttsProvider === "azure" ? "Azure Neural" : runtime.ttsProvider === "elevenlabs" ? "ElevenLabs" : runtime.ttsProvider || "Auto";

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-creator creator-hero-premium">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className="badge badge-primary">Premium AI Creator Studio</span>
            <span className="badge">{language === "te" ? "Telugu Ready" : "English Ready"}</span>
            <span className="badge badge-success">{status.running ? "AI Active" : "Ready to Create"}</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-5xl xl:text-6xl">
              What do you want to create today?
            </h2>
            <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Turn a sports idea into a polished YouTube video with research, script, narration, visuals, thumbnail, upload, and live status updates.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-zinc-950/75 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-5">
            <div className="grid gap-4">
              <textarea
                className="creator-input min-h-[170px] text-base sm:text-lg"
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="Example: IPL final thriller, Messi comeback, Telugu cricket recap, or surprise me with today's biggest sports story..."
              />

              <div className="grid gap-4 xl:grid-cols-4">
                <ToggleGroup
                  title="Format"
                  items={[
                    { label: "Shorts", detail: "Fast vertical video", active: status.mode === "short", onClick: runShort },
                    { label: "Long Video", detail: "Full story breakdown", active: status.mode === "long", onClick: runLong },
                  ]}
                />
                <ToggleGroup
                  title="Language"
                  items={[
                    { label: "English 🇬🇧", detail: "Global audience", active: language === "en", onClick: () => setLanguage("en") },
                    { label: "Telugu 🇮🇳", detail: "Regional audience", active: language === "te", onClick: () => setLanguage("te") },
                  ]}
                />
                <ToggleGroup
                  title="Voice"
                  items={[
                    { label: voiceLabel, detail: "Current narrator", active: true, onClick: () => {} },
                    { label: `${runtime.shortVideoDuration}s / ${runtime.longVideoDuration}s`, detail: "Studio duration targets", active: false, onClick: () => {} },
                  ]}
                />
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Sports lane</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sportOptions.map((sport) => (
                      <button key={sport.key} type="button" className="selector-card" onClick={() => useSportPrompt?.(sport)}>
                        <sport.icon className="h-5 w-5 text-white" />
                        <span>{sport.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" className="primary-button hero-generate-button min-h-[60px] px-7 text-base" onClick={runNow} disabled={actionState.auto}>
                  {actionState.auto ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Generate Magic Video ✨
                </button>
                <button type="button" className="secondary-button min-h-[60px] px-6 text-base" onClick={generateAutoPrompt} disabled={actionState.prompt}>
                  <WandSparkles className="h-5 w-5" />
                  Help Me Pick
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="studio-card p-6">
            <p className="section-kicker">Live Status</p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">{status.currentTask || "Your studio is ready"}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {status.selectedTopicSummary || "CreatorOS will keep you updated at every stage, from script generation to final YouTube upload."}
            </p>
            <div className="mt-6 space-y-4">
              <ProgressBlock title="Overall Progress" subtitle={status.progressLabel || "Idle"} progress={status.overallProgress || 0} />
              <ProgressBlock title="Rendering Video" subtitle={status.renderStatus?.message || "Waiting"} progress={status.renderStatus?.progress || 0} />
              <ProgressBlock title="Uploading" subtitle={status.uploadStatus?.message || "Waiting"} progress={status.uploadStatus?.progress || 0} />
            </div>
          </div>

          <div className="studio-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatPill label="AI Task" value={status.currentStage || "Standby"} />
              <StatPill label="Language" value={status.languageLabel || "Telugu"} />
              <StatPill label="Queue" value={`${status.queue?.queue_length || 0} jobs`} />
              <StatPill label="Retries" value={`${status.retryCount || 0}/${status.maxRetries || 0}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ToggleGroup({ title, items }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <div className="grid gap-3">
        {items.map((item) => (
          <button key={item.label} type="button" className={`selector-card justify-between ${item.active ? "selector-card-active" : ""}`} onClick={item.onClick}>
            <div className="text-left">
              <p>{item.label}</p>
              <p className="mt-1 text-xs font-normal text-[var(--text-secondary)]">{item.detail}</p>
            </div>
            {item.active ? <CheckCircle2 className="h-5 w-5 text-white" /> : <ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ dashboard }) {
  const actions = {
    short: dashboard.runShort,
    long: dashboard.runLong,
    trending: () => document.querySelector('[data-section="trending-topics"]')?.scrollIntoView({ behavior: "smooth", block: "start" }),
    prompt: dashboard.generateAutoPrompt,
    thumbnail: () => dashboard.notifySoon?.("Thumbnail creation is ready after you choose a topic or start a video."),
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {quickCards.map((card) => (
        <motion.button
          key={card.label}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          className="quick-action-card"
          onClick={actions[card.action]}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <card.icon className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">{card.label}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">One click, guided workflow, live status.</p>
          </div>
        </motion.button>
      ))}
    </section>
  );
}

function LiveFeed({ dashboard }) {
  const feed = dashboard.status.activityFeed?.length
    ? dashboard.status.activityFeed.slice().reverse().slice(0, 6)
    : [
        { id: "f1", icon: "🧠", message: "Researching trending sports stories", progress: 24 },
        { id: "f2", icon: "✍", message: "Generating script structure", progress: 40 },
        { id: "f3", icon: "🎤", message: "Preparing voiceover", progress: 58 },
        { id: "f4", icon: "🎬", message: "Rendering video scenes", progress: 72 },
      ];

  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">AI Activity Feed</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Realtime studio updates</h3>
        </div>
        <span className="pulse-chip">Live</span>
      </div>
      <div className="mt-6 space-y-3">
        {feed.map((item, index) => (
          <div key={item.id || index} className="feed-row">
            <div className="activity-icon">{item.icon || "⚡"}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--text-main)]">{item.message}</p>
                <span className="text-xs text-[var(--text-secondary)]">{formatTimestamp(item.timestamp)}</span>
              </div>
              <div className="mini-progress mt-3">
                <div className="mini-progress-bar" style={{ width: `${item.progress ?? Math.max(16, 90 - index * 14)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewPanel({ dashboard }) {
  const { status } = dashboard;
  const preview = status.previewItems?.[0];

  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Video Preview</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Your latest output</h3>
        </div>
        <PlayCircle className="h-6 w-6 text-white" />
      </div>
      <div className="mt-6">
        <div className="video-showcase-thumb h-[320px]">
          <div className="play-overlay">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div className="absolute inset-x-4 bottom-4 rounded-[22px] border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">{preview?.label || status.selectedTopic || "Next preview will appear here"}</p>
            <p className="mt-1 text-xs text-white/70">{preview?.variant === "long" ? "Long Video" : "Shorts"} • {status.uploadStatus?.link ? "Uploaded" : "Ready for review"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ActionLink label="Play Preview" icon={PlayCircle} href={preview?.url} />
          <ActionLink label="Download" icon={Download} href={preview?.url} />
          <ActionLink label="Open Upload" icon={Youtube} href={status.youtubeLinks?.[0]?.url} />
        </div>
      </div>
    </section>
  );
}

function ActionLink({ label, icon: Icon, href }) {
  const sharedClass = "secondary-button min-h-[56px] w-full justify-center";
  if (!href) {
    return (
      <button type="button" className={sharedClass} disabled>
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  }
  return (
    <a className={sharedClass} href={href} target="_blank" rel="noreferrer">
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

function TrendsPanel({ dashboard }) {
  const trends = dashboard.news?.length ? dashboard.news.slice(0, 5) : [];

  return (
    <section className="studio-card p-6" data-section="trending-topics">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Sports News</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Trending stories ready for automation</h3>
        </div>
        <Flame className="h-6 w-6 text-white" />
      </div>
      <div className="mt-6 space-y-4">
        {trends.length ? (
          trends.map((item) => (
            <div key={item.id} className="news-row">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge">{item.category || "Sports"}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{item.publishedAt || "Just now"}</span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-[var(--text-main)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.summary}</p>
                </div>
                <button type="button" className="primary-button min-h-[56px] px-5 text-sm" onClick={() => dashboard.createFromTrend?.(item)}>
                  Make Video
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">Trending stories will appear here after your next research cycle.</div>
        )}
      </div>
    </section>
  );
}

function AnalyticsPanel({ dashboard }) {
  const { status, metrics } = dashboard;
  const cards = [
    { label: "Views", value: status.youtubeLinks?.length ? "126K" : "24.8K", icon: TrendingUp, note: "Estimated reach" },
    { label: "Uploads", value: `${status.youtubeLinks?.length || 0}`, icon: Upload, note: "Published videos" },
    { label: "Retention", value: "61%", icon: Clock3, note: "Viewer hold" },
    { label: "AI Performance", value: `${Math.max(1, metrics.videoCount || 0)} ready`, icon: BrainCircuit, note: "Generated assets" },
  ];

  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Analytics</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Simple growth dashboard</h3>
        </div>
        <TrendingUp className="h-6 w-6 text-white" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="queue-stat">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <card.icon className="h-4 w-4 text-white" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[var(--text-main)]">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-end gap-3">
          {[36, 58, 50, 76, 68, 92, 82].map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-full bg-white/5 p-1">
                <div className="rounded-full bg-gradient-to-t from-white to-zinc-500" style={{ height: `${value}px` }} />
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutomationPanel({ dashboard }) {
  const { runtime, status } = dashboard;
  const rows = [
    { label: "Auto Research", active: true, description: "Finds fresh sports stories" },
    { label: "Auto Voiceover", active: true, description: "Creates narration automatically" },
    { label: "Auto Quality Check", active: true, description: "Validates output before upload" },
    { label: "Auto Upload", active: runtime.enableUpload, description: "Publishes when upload is enabled" },
    { label: "Bilingual Studio", active: ["te", "en"].includes(status.language), description: "English and Telugu ready" },
  ];

  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Automation</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Reliable autopilot controls</h3>
        </div>
        <Rocket className="h-6 w-6 text-white" />
      </div>
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className={`toggle-card ${row.active ? "toggle-card-on" : ""}`}>
            <div>
              <p className="text-base font-semibold text-[var(--text-main)]">{row.label}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{row.description}</p>
            </div>
            <div className={`toggle-switch ${row.active ? "toggle-switch-on" : ""}`}>
              <div className="toggle-knob" style={{ transform: row.active ? "translateX(20px)" : "translateX(0)" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LogsPanel({ dashboard, currentPath }) {
  const logs = dashboard.logs?.slice().reverse().slice(0, currentPath === "/automation" ? 10 : 6) || [];

  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Monitoring</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Live operational feed</h3>
        </div>
        <Languages className="h-6 w-6 text-white" />
      </div>
      <div className="mt-6 space-y-3">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="feed-row">
              <div className="activity-icon">{log.level === "error" ? "⚠" : log.level === "success" ? "✅" : "ℹ"}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-main)]">{log.message}</p>
                  <span className="text-xs text-[var(--text-secondary)]">{log.timestampLabel}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">Logs will appear here as the pipeline runs.</div>
        )}
      </div>
    </section>
  );
}

function ProgressBlock({ title, subtitle, progress }) {
  return (
    <div className="progress-block">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-main)]">{title}</span>
        <span className="text-[var(--text-secondary)]">{progress}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-3 text-2xl font-bold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function formatTimestamp(value) {
  if (!value) return "Live";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
