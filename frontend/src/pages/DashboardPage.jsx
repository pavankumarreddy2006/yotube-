import {
  AlertCircle,
  Bot,
  CheckCircle2,
  LoaderCircle,
  MessageSquareShare,
  MicVocal,
  Newspaper,
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

  const statusTone = status?.failed ? "failed" : status?.running ? "running" : "idle";
  const latestLinks = status?.youtubeLinks || [];
  const queue = status?.queue || { current_job: null, queued_jobs: [], queue_length: 0 };
  const progress = getProgress(status);

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} onDismiss={dashboard.dismissToast} />

      <section className="hero-shell">
        <div className="hero-grid">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-cyan">One-click automation</span>
              <span className="chip">Language: {language === "te" ? "Telugu" : "English"}</span>
              <span className={`chip ${statusTone === "failed" ? "chip-rose" : statusTone === "running" ? "chip-amber" : "chip-emerald"}`}>
                {status?.statusLabel || "Idle"}
              </span>
            </div>

            <div>
              <h2 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Control the full AI YouTube pipeline from one clean dashboard.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                News intake, prompt generation, Telugu voice, video rendering, thumbnails, YouTube upload, and Telegram alerts are now managed from one place.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="News Ready" value={String(metrics.newsCount)} icon={Newspaper} />
              <MetricCard label="Rendered Videos" value={String(metrics.videoCount)} icon={Video} />
              <MetricCard label="Uploads" value={String(metrics.uploadCount)} icon={Upload} />
              <MetricCard label="System Logs" value={String(metrics.logCount)} icon={Bot} />
            </div>
          </div>

          <div className="section-surface space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live pipeline</p>
                <p className="mt-2 text-2xl font-semibold text-white">{status?.currentTask || "Waiting for next run"}</p>
              </div>
              {status?.running ? <LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" /> : <CheckCircle2 className="h-8 w-8 text-emerald-300" />}
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Current stage</p>
              <p className="mt-1 text-lg font-medium text-white">{status?.currentStage || "idle"}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#2563eb,#f59e0b)] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-4 text-sm text-slate-400">Last run</p>
              <p className="mt-1 text-white">{status?.lastRunTimeLabel || "Not available yet"}</p>
            </div>
            <div className="space-y-2">
              <StatusRow label="Processing" active={Boolean(status?.running)} />
              <StatusRow label="Completed" active={status?.status === "completed"} success />
              <StatusRow label="Failed" active={Boolean(status?.failed)} danger />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="section-surface space-y-5">
          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Dashboard Control Panel</h3>
              <p className="text-sm text-slate-400">Start full automation, Shorts-only, or long-form production with optional manual topic override.</p>
            </div>
          </div>

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
            <span className="text-sm text-slate-300">Prompt input / manual topic</span>
            <textarea
              className="input-surface min-h-[120px] w-full resize-y"
              value={promptInput}
              onChange={(event) => dashboard.setPromptInput(event.target.value)}
              placeholder="Example: IPL playoff race, MS Dhoni latest update, India match preview..."
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={dashboard.runNow} disabled={actionState.auto || status?.running} className="start-button">
              {actionState.auto ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
              Start Auto Mode
            </button>
            <button type="button" onClick={dashboard.runShort} disabled={actionState.short || status?.running} className="ghost-button">
              {actionState.short ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Start Short Video
            </button>
            <button type="button" onClick={dashboard.runLong} disabled={actionState.long || status?.running} className="ghost-button">
              {actionState.long ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Start Long Video
            </button>
            <button type="button" onClick={dashboard.generateAutoPrompt} disabled={actionState.prompt} className="ghost-button">
              {actionState.prompt ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Auto Prompt Generator
            </button>
          </div>

          {generatedPrompt ? (
            <div className="rounded-[20px] border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-2 text-cyan-200">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Generated prompt</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">{generatedPrompt}</p>
            </div>
          ) : null}

          {askAiResult?.script ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">AI script preview</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{String(askAiResult.script).slice(0, 420)}...</p>
            </div>
          ) : null}
        </div>

        <div className="section-surface space-y-5">
          <div className="flex items-center gap-3">
            <MessageSquareShare className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Telegram Settings Panel</h3>
              <p className="text-sm text-slate-400">Configure alert delivery for upload success, errors, and live pipeline progress.</p>
            </div>
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleCard label="Notifications" checked={settingsForm?.enableNotifications} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableNotifications: checked }))} />
            <ToggleCard label="YouTube Upload" checked={settingsForm?.enableUpload} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableUpload: checked }))} />
          </div>

          <div className="flex flex-wrap gap-3">
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
              Save Settings
            </button>
            <button type="button" onClick={dashboard.sendTelegramTest} disabled={actionState.telegram} className="ghost-button">
              {actionState.telegram ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageSquareShare className="h-4 w-4" />}
              Send Test Alert
            </button>
          </div>

          {latestLinks.length ? (
            <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-200">Latest uploaded links</p>
              <div className="mt-3 space-y-2">
                {latestLinks.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="block text-sm text-white underline decoration-cyan-400/50 underline-offset-4">
                    {item.label}: {item.url}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="section-surface">
          <div className="mb-4 flex items-center gap-3">
            <Bot className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Queue Status Panel</h3>
              <p className="text-sm text-slate-400">One job runs at a time. New clicks wait safely in FIFO order.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusTile label="Running Job" value={queue.current_job ? queue.current_job.mode : "None"} tone="amber" />
            <StatusTile label="Queued Jobs" value={String(queue.queue_length || 0)} tone="emerald" />
            <StatusTile label="Last Result" value={status?.failed ? "Failed" : status?.status === "completed" ? "Completed" : "Waiting"} tone={status?.failed ? "rose" : "emerald"} />
          </div>
          <div className="mt-5 space-y-3">
            {queue.current_job ? <QueueCard job={queue.current_job} title="Now running" /> : null}
            {(queue.queued_jobs || []).slice(0, 5).map((job) => (
              <QueueCard key={job.id} job={job} title={`Queued #${job.position}`} queued />
            ))}
            {!queue.current_job && !(queue.queued_jobs || []).length ? <div className="empty-state">No jobs in queue.</div> : null}
          </div>
        </div>

        <div className="section-surface">
          <div className="mb-4 flex items-center gap-3">
            <Newspaper className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">News Section</h3>
              <p className="text-sm text-slate-400">Latest sports stories feeding the prompt and script generation flow.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {news.length ? news.map((item) => <NewsCard key={item.id} item={item} />) : <div className="empty-state md:col-span-2">No news cards available yet.</div>}
          </div>
        </div>

        <div className="section-surface">
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Video Status & Notifications</h3>
              <p className="text-sm text-slate-400">Realtime processing, completion, failures, and operational trace.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusTile label="Processing" value={status?.running ? "Active" : "Idle"} tone="amber" />
            <StatusTile label="Completed" value={status?.status === "completed" ? "Yes" : "No"} tone="emerald" />
            <StatusTile label="Failed" value={status?.failed ? "Yes" : "No"} tone="rose" />
          </div>
          <div className="mt-5 space-y-3">
            {(status?.notifications || []).slice().reverse().slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                {item.message}
              </div>
            ))}
          </div>
          <div className="mt-5 terminal-panel max-h-[360px] space-y-3">
            {logs.slice(-14).reverse().map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.timestampLabel}</p>
                <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${item.level === "error" ? "text-rose-300" : item.level === "success" ? "text-emerald-300" : "text-cyan-300"}`}>
                  {item.level}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="section-surface space-y-5">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Settings Page</h3>
              <p className="text-sm text-slate-400">Control video lengths, voice provider, API order, and prompt behavior.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Short video duration</span>
              <input className="input-surface w-full" type="number" value={settingsForm?.shortVideoDuration || 45} onChange={(event) => setSettingsForm((prev) => ({ ...prev, shortVideoDuration: Number(event.target.value) }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Long video duration</span>
              <input className="input-surface w-full" type="number" value={settingsForm?.longVideoDuration || 180} onChange={(event) => setSettingsForm((prev) => ({ ...prev, longVideoDuration: Number(event.target.value) }))} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Voice selection</span>
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

          <label className="space-y-2">
            <span className="text-sm text-slate-300">API selection / fallback order</span>
            <input
              className="input-surface w-full"
              value={(settingsForm?.preferredNewsSources || []).join(", ")}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, preferredNewsSources: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
              placeholder="cricapi, newsapi, fallback"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Prompt seed</span>
            <textarea className="input-surface min-h-[100px] w-full resize-y" value={settingsForm?.promptSeed || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, promptSeed: event.target.value }))} placeholder="Add channel tone, CTA style, thumbnail preferences, or content guardrails..." />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleCard label="Generate Shorts" checked={settingsForm?.enableShorts} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableShorts: checked }))} />
            <ToggleCard label="Generate Long Video" checked={settingsForm?.enableLongVideo} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableLongVideo: checked }))} />
          </div>
        </div>

        <div className="section-surface space-y-5">
          <div className="flex items-center gap-3">
            <MicVocal className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-xl font-semibold text-white">Quality Upgrade Notes</h3>
              <p className="text-sm text-slate-400">Practical improvements already supported by this architecture.</p>
            </div>
          </div>

          <QualityPoint title="Better Telugu voice">
            Put `edge` or `coqui` first in voice selection for a more natural Telugu path. The backend still falls back automatically through ElevenLabs, Azure, OpenAI, and gTTS.
          </QualityPoint>
          <QualityPoint title="Improved visuals">
            News cards now preserve source images, and the pipeline passes highlight-specific visual queries into video generation for more relevant scenes.
          </QualityPoint>
          <QualityPoint title="Thumbnail direction">
            Use bold 2-4 word Telugu or English text, one key athlete/team image, and high-contrast red/yellow accents. The backend now exposes topic-aware prompt seed support.
          </QualityPoint>
          <QualityPoint title="Hosting strategy">
            Frontend can go to Vercel or Netlify. FastAPI backend fits Railway or Render. Media artifacts should move to Cloudinary, Supabase Storage, or Firebase Storage when you outgrow local disk.
          </QualityPoint>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="metric-tile">
      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 w-fit">
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      <p className="mt-4 text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusRow({ label, active, success = false, danger = false }) {
  const tone = danger ? "text-rose-300" : success ? "text-emerald-300" : active ? "text-amber-300" : "text-slate-400";
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-sm font-medium ${tone}`}>{active ? "Yes" : "No"}</span>
    </div>
  );
}

function NewsCard({ item }) {
  return (
    <article className="news-item">
      {item.image ? <img src={item.image} alt={item.title} className="h-36 w-full rounded-[20px] object-cover md:w-40" /> : <div className="news-image-fallback"><Newspaper className="h-7 w-7 text-cyan-200" /></div>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip chip-cyan">{item.category}</span>
          <span className="chip">{item.source}</span>
        </div>
        <h4 className="mt-3 text-lg font-semibold text-white">{item.title}</h4>
        <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{item.publishedAt || "Latest feed"}</p>
      </div>
    </article>
  );
}

function StatusTile({ label, value, tone }) {
  const styles = {
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  };
  return (
    <div className={`rounded-[20px] border p-4 ${styles[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ToggleCard({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-left">
      <p className="text-sm text-slate-300">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${checked ? "text-emerald-300" : "text-slate-400"}`}>{checked ? "Enabled" : "Disabled"}</p>
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

function QualityPoint({ title, children }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
    </div>
  );
}

function QueueCard({ job, title, queued = false }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className={`chip ${queued ? "" : "chip-amber"}`}>{job.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-300">Mode: {job.mode}</p>
      <p className="mt-1 text-sm text-slate-400">Language: {job.language === "te" ? "Telugu" : "English"}</p>
      {job.current_stage ? <p className="mt-1 text-sm text-slate-400">Stage: {job.current_stage}</p> : null}
      {job.prompt ? <p className="mt-2 text-sm text-slate-500">{job.prompt}</p> : null}
    </div>
  );
}

function getProgress(status) {
  if (status?.failed) return 100;
  if (status?.status === "completed") return 100;
  const stage = String(status?.currentStage || "").toLowerCase();
  if (stage.includes("started")) return 10;
  if (stage.includes("news")) return 22;
  if (stage.includes("script")) return 38;
  if (stage.includes("voice")) return 58;
  if (stage.includes("video")) return 82;
  if (stage.includes("upload")) return 94;
  return status?.running ? 8 : 0;
}
