import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageSquareShare,
  Newspaper,
  Radio,
  Rocket,
  Settings2,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage({ dashboard }) {
  const { status, news, logs, runtime, language, actionState, metrics, promptInput, generatedPrompt, askAiResult, toasts } = dashboard;
  const [settingsForm, setSettingsForm] = useState(runtime);

  useEffect(() => {
    setSettingsForm(runtime);
  }, [runtime]);

  if (!runtime) {
    return <div className="empty-state">Loading automation console...</div>;
  }

  const statusTone = status?.failed ? "rose" : status?.running ? "amber" : "emerald";
  const progress = getProgress(status);
  const latestLinks = status?.youtubeLinks || [];
  const queue = status?.queue || { current_job: null, queued_jobs: [], queue_length: 0 };
  const recentLogs = logs.slice(-8).reverse();
  const cards = [
    { label: "Stories Ready", value: String(metrics.newsCount), meta: "Feed health", icon: Newspaper },
    { label: "Rendered Assets", value: String(metrics.videoCount), meta: "Preview count", icon: Video },
    { label: "Published Links", value: String(metrics.uploadCount), meta: "YouTube output", icon: Upload },
    { label: "System Events", value: String(metrics.logCount), meta: "Operational trace", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} onDismiss={dashboard.dismissToast} />

      <section className="hero-shell">
        <div className="hero-grid">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-gold">Live Automation</span>
              <span className="chip">Language: {language === "te" ? "Telugu" : "English"}</span>
              <span className={`chip ${statusTone === "rose" ? "chip-rose" : statusTone === "amber" ? "chip-amber" : "chip-emerald"}`}>
                {status?.statusLabel || "Idle"}
              </span>
            </div>

            <div className="space-y-4">
              <h2 className="max-w-4xl font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
                Professional sports video automation, finally presented like a real control product.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Run story selection, script generation, Telugu voice, video rendering, thumbnail output, Telegram notifications, and upload tracking from one polished dashboard.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </div>
          </div>

          <div className="hero-status-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-label">Pipeline Status</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{status?.currentTask || "Waiting for next run"}</h3>
              </div>
              {status?.running ? <LoaderCircle className="h-8 w-8 animate-spin text-amber-300" /> : <CheckCircle2 className="h-8 w-8 text-emerald-300" />}
            </div>

            <div className="status-showcase">
              <div>
                <p className="text-sm text-slate-400">Current stage</p>
                <p className="mt-1 text-lg font-medium text-white">{status?.currentStage || "idle"}</p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Last Run" value={status?.lastRunTimeLabel || "Not yet"} />
                <MiniStat label="Queue" value={`${queue.queue_length || 0} waiting`} />
                <MiniStat label="Topic" value={status?.selectedTopic || "Auto pick"} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatusFlag label="Processing" value={status?.running ? "Active" : "Standby"} tone="amber" />
              <StatusFlag label="Completed" value={status?.status === "completed" ? "Yes" : "No"} tone="emerald" />
              <StatusFlag label="Failed" value={status?.failed ? "Yes" : "No"} tone="rose" />
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="section-surface space-y-5">
          <SectionHeading
            icon={Rocket}
            title="Launch Center"
            description="Kick off full automation, short-form production, long-form rendering, or prompt generation from one strong action strip."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Language</span>
              <select className="input-surface w-full" value={language} onChange={(event) => dashboard.setLanguage(event.target.value)}>
                {runtime.languageOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Default mode</span>
              <select
                className="input-surface w-full"
                value={settingsForm?.defaultMode || "full"}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultMode: event.target.value }))}
              >
                {runtime.modeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Manual topic or prompt seed</span>
            <textarea
              className="input-surface min-h-[150px] w-full resize-y"
              value={promptInput}
              onChange={(event) => dashboard.setPromptInput(event.target.value)}
              placeholder="Example: IPL playoff race, MS Dhoni latest update, India match preview, transfer rumours..."
            />
          </label>

          <div className="action-cluster">
            <button type="button" onClick={dashboard.runNow} disabled={actionState.auto || status?.running} className="start-button">
              {actionState.auto ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
              Start Auto Run
            </button>
            <button type="button" onClick={dashboard.runShort} disabled={actionState.short || status?.running} className="ghost-button">
              {actionState.short ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Short Video
            </button>
            <button type="button" onClick={dashboard.runLong} disabled={actionState.long || status?.running} className="ghost-button">
              {actionState.long ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Long Video
            </button>
            <button type="button" onClick={dashboard.generateAutoPrompt} disabled={actionState.prompt} className="ghost-button">
              {actionState.prompt ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Generate Prompt
            </button>
          </div>

          {generatedPrompt ? (
            <div className="highlight-card highlight-cyan">
              <div className="flex items-center gap-2 text-cyan-200">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Generated prompt</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">{generatedPrompt}</p>
            </div>
          ) : null}

          {askAiResult?.script ? (
            <div className="highlight-card">
              <p className="text-sm font-medium text-white">AI script preview</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{String(askAiResult.script).slice(0, 420)}...</p>
            </div>
          ) : null}
        </div>

        <div className="section-surface space-y-5">
          <SectionHeading
            icon={Radio}
            title="Alert & Runtime Controls"
            description="Tune delivery behavior, Telegram output, and runtime configuration without leaving the main dashboard."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Bot token</span>
              <input
                className="input-surface w-full"
                value={settingsForm?.telegramBotToken || ""}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramBotToken: event.target.value }))}
                placeholder="Telegram bot token"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Chat ID</span>
              <input
                className="input-surface w-full"
                value={settingsForm?.telegramChatId || ""}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramChatId: event.target.value }))}
                placeholder="Telegram chat id"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleCard label="Notifications" checked={settingsForm?.enableNotifications} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableNotifications: checked }))} />
            <ToggleCard label="YouTube Upload" checked={settingsForm?.enableUpload} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableUpload: checked }))} />
            <ToggleCard label="Shorts Enabled" checked={settingsForm?.enableShorts} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableShorts: checked }))} />
            <ToggleCard label="Long Video Enabled" checked={settingsForm?.enableLongVideo} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableLongVideo: checked }))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Voice provider</span>
              <select className="input-surface w-full" value={settingsForm?.ttsProvider || "gtts"} onChange={(event) => setSettingsForm((prev) => ({ ...prev, ttsProvider: event.target.value }))}>
                {runtime.ttsOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Prompt style</span>
              <select className="input-surface w-full" value={settingsForm?.promptStyle || "breaking"} onChange={(event) => setSettingsForm((prev) => ({ ...prev, promptStyle: event.target.value }))}>
                <option value="breaking">Breaking</option>
                <option value="analysis">Analysis</option>
                <option value="hype">Hype</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Short duration</span>
              <input className="input-surface w-full" type="number" value={settingsForm?.shortVideoDuration || 45} onChange={(event) => setSettingsForm((prev) => ({ ...prev, shortVideoDuration: Number(event.target.value) }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Long duration</span>
              <input className="input-surface w-full" type="number" value={settingsForm?.longVideoDuration || 180} onChange={(event) => setSettingsForm((prev) => ({ ...prev, longVideoDuration: Number(event.target.value) }))} />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Preferred news source order</span>
            <input
              className="input-surface w-full"
              value={(settingsForm?.preferredNewsSources || []).join(", ")}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, preferredNewsSources: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
              placeholder="cricapi, newsapi, fallback"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Prompt seed</span>
            <textarea
              className="input-surface min-h-[110px] w-full resize-y"
              value={settingsForm?.promptSeed || ""}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, promptSeed: event.target.value }))}
              placeholder="Channel tone, CTA style, thumbnail direction, safety guardrails..."
            />
          </label>

          <div className="action-cluster">
            <button
              type="button"
              onClick={() =>
                dashboard.saveRuntimeSettings({
                  default_language: language,
                  default_mode: settingsForm.defaultMode,
                  enable_shorts: settingsForm.enableShorts,
                  enable_long_video: settingsForm.enableLongVideo,
                  enable_upload: settingsForm.enableUpload,
                  enable_notifications: settingsForm.enableNotifications,
                  tts_provider: settingsForm.ttsProvider,
                  preferred_news_sources: settingsForm.preferredNewsSources,
                  short_video_duration: settingsForm.shortVideoDuration,
                  long_video_duration: settingsForm.longVideoDuration,
                  telegram_bot_token: settingsForm.telegramBotToken,
                  telegram_chat_id: settingsForm.telegramChatId,
                  prompt_seed: settingsForm.promptSeed,
                  prompt_style: settingsForm.promptStyle,
                })
              }
              disabled={actionState.saveSettings}
              className="start-button"
            >
              {actionState.saveSettings ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Settings2 className="h-5 w-5" />}
              Save Runtime
            </button>

            <button type="button" onClick={dashboard.sendTelegramTest} disabled={actionState.telegram} className="ghost-button">
              {actionState.telegram ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageSquareShare className="h-4 w-4" />}
              Send Telegram Test
            </button>
          </div>

          {latestLinks.length ? (
            <div className="highlight-card highlight-emerald">
              <p className="text-sm font-medium text-emerald-100">Latest uploaded links</p>
              <div className="mt-3 space-y-2">
                {latestLinks.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white underline decoration-emerald-300/50 underline-offset-4">
                    <ArrowUpRight className="h-4 w-4" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="section-surface space-y-5">
          <SectionHeading icon={Clock3} title="Queue & Jobs" description="One job runs at a time. Clicks stay safe in FIFO order and stage updates remain visible." />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusFlag label="Running Job" value={queue.current_job ? queue.current_job.mode : "None"} tone="amber" />
            <StatusFlag label="Queued Jobs" value={String(queue.queue_length || 0)} tone="emerald" />
            <StatusFlag label="Last Result" value={status?.failed ? "Failed" : status?.status === "completed" ? "Completed" : "Waiting"} tone={status?.failed ? "rose" : "emerald"} />
          </div>

          <div className="space-y-3">
            {queue.current_job ? <QueueCard job={queue.current_job} title="Now running" /> : null}
            {(queue.queued_jobs || []).slice(0, 5).map((job) => (
              <QueueCard key={job.id} job={job} title={`Queued #${job.position}`} queued />
            ))}
            {!queue.current_job && !(queue.queued_jobs || []).length ? <div className="empty-state">No jobs in queue.</div> : null}
          </div>
        </div>

        <div className="section-surface space-y-5">
          <SectionHeading icon={Newspaper} title="Story Feed" description="The most recent sports stories powering prompts, scripts, and visual selection." />
          <div className="grid gap-4">
            {news.length ? news.slice(0, 6).map((item) => <NewsCard key={item.id} item={item} />) : <div className="empty-state">No news cards available yet.</div>}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="section-surface space-y-5">
          <SectionHeading icon={Upload} title="Activity Stream" description="Realtime notifications and a compact operational log for debugging and production awareness." />

          <div className="space-y-3">
            {(status?.notifications || []).slice().reverse().slice(0, 5).map((item) => (
              <div key={item.id} className="feed-row">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
                <div>
                  <p className="text-sm text-white">{item.message}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{item.timestamp || "event"}</p>
                </div>
              </div>
            ))}
            {!(status?.notifications || []).length ? <div className="empty-state">No notifications yet.</div> : null}
          </div>
        </div>

        <div className="section-surface space-y-5">
          <SectionHeading icon={Activity} title="System Log" description="Recent backend activity with quick severity scanning." />
          <div className="terminal-panel max-h-[460px] space-y-3">
            {recentLogs.map((item) => (
              <div key={item.id} className="log-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.timestampLabel}</p>
                  <span className={`chip ${item.level === "error" ? "chip-rose" : item.level === "success" ? "chip-emerald" : "chip-gold"}`}>{item.level}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{item.message}</p>
              </div>
            ))}
            {!recentLogs.length ? <div className="empty-state">No logs available.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="section-icon">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, meta, icon: Icon }) {
  return (
    <div className="metric-tile">
      <div className="flex items-start justify-between gap-4">
        <div className="section-icon">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="eyebrow-label">{meta}</span>
      </div>
      <p className="mt-5 text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function StatusFlag({ label, value, tone }) {
  const styles = {
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  };
  return (
    <div className={`rounded-[20px] border p-4 ${styles[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ToggleCard({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`toggle-surface ${checked ? "toggle-surface-on" : "toggle-surface-off"}`}>
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{checked ? "Enabled" : "Disabled"}</p>
      </div>
      <div className={`toggle-pill ${checked ? "toggle-pill-on" : "toggle-pill-off"}`}>
        <span className={`toggle-knob ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

function ToastStack({ items, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-3">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onDismiss(item.id)} className={`toast-card ${item.tone === "error" ? "toast-card-error" : item.tone === "success" ? "toast-card-success" : "toast-card-info"}`}>
          {item.message}
        </button>
      ))}
    </div>
  );
}

function QueueCard({ job, title, queued = false }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className={`chip ${queued ? "chip-gold" : "chip-amber"}`}>{job.status}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoPair label="Mode" value={job.mode} />
        <InfoPair label="Language" value={job.language === "te" ? "Telugu" : "English"} />
        <InfoPair label="Stage" value={job.current_stage || "Queued"} />
        <InfoPair label="Prompt" value={job.prompt || "Auto-selected topic"} />
      </div>
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/10 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function NewsCard({ item }) {
  return (
    <article className="news-item">
      {item.image ? (
        <img src={item.image} alt={item.title} className="h-36 w-full rounded-[20px] object-cover md:h-32 md:w-40" />
      ) : (
        <div className="news-image-fallback">
          <Newspaper className="h-7 w-7 text-amber-200" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip chip-gold">{item.category}</span>
          <span className="chip">{item.source}</span>
        </div>
        <h4 className="mt-3 text-lg font-semibold text-white">{item.title}</h4>
        <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{item.publishedAt || "Latest feed"}</p>
      </div>
    </article>
  );
}

function getProgress(status) {
  if (status?.failed || status?.status === "completed") return 100;
  const stage = String(status?.currentStage || "").toLowerCase();
  if (stage.includes("started")) return 10;
  if (stage.includes("news")) return 25;
  if (stage.includes("script")) return 45;
  if (stage.includes("voice")) return 62;
  if (stage.includes("video")) return 84;
  if (stage.includes("upload")) return 96;
  return status?.running ? 8 : 0;
}
