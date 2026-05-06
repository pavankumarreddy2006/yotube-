import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mic2,
  Newspaper,
  Play,
  RefreshCcw,
  Send,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DashboardPage({ dashboard, currentPath }) {
  const { status, news, logs, runtime, actionState } = dashboard;

  if (!status || !runtime) {
    return <div className="empty-state">Loading live studio...</div>;
  }

  const pages = {
    "/dashboard": (
      <>
        <CreatorHero dashboard={dashboard} />
        <OverviewGrid status={status} news={news} />
        <LiveStudio status={status} logs={logs} />
        <QueueAndAlerts status={status} />
      </>
    ),
    "/video-generator": <CreatorHero dashboard={dashboard} expanded />,
    "/sports-news": <SportsNewsPanel news={news} status={status} expanded />,
    "/ai-content": <LiveStudio status={status} logs={logs} expanded />,
    "/uploads": <UploadControlCenter status={status} expanded />,
    "/analytics": <OverviewGrid status={status} news={news} expanded />,
    "/automation": <QueueAndAlerts status={status} expanded />,
    "/thumbnails": <ThumbnailPanel status={status} />,
    "/settings": <SettingsPanel dashboard={dashboard} runtime={runtime} actionState={actionState} />,
  };

  return <div className="space-y-6">{pages[currentPath] || pages["/dashboard"]}</div>;
}

function CreatorHero({ dashboard, expanded = false }) {
  const { status, language, setLanguage, promptInput, setPromptInput, runNow, runShort, runLong, generateAutoPrompt, actionState } = dashboard;

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-creator">
      <div className={`grid gap-6 ${expanded ? "xl:grid-cols-[1.2fr_0.8fr]" : "xl:grid-cols-[1.35fr_0.65fr]"}`}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="badge">AI Creator Studio</span>
            <span className="badge">{language === "te" ? "Telugu mode" : "English mode"}</span>
            <span className="badge">{status.mode === "short" ? "Shorts focus" : "Full automation"}</span>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-main)] sm:text-5xl">What do you want to create today?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Launch a live sports video run with instant status tracking, upload visibility, and Telegram alerts from one screen.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
            <textarea
              className="creator-input min-h-[148px]"
              value={promptInput}
              onChange={(event) => setPromptInput(event.target.value)}
              placeholder="Enter a sports topic, rivalry, breaking news angle, or leave blank for fully autonomous mode."
            />
            <select className="creator-input h-[60px]" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="te">Telugu</option>
              <option value="en">English</option>
            </select>
            <button type="button" className="primary-button h-[60px]" onClick={generateAutoPrompt} disabled={actionState.prompt}>
              {actionState.prompt ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Generate Plan
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="primary-button" onClick={runNow} disabled={actionState.auto}>
              {actionState.auto ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Start Full Auto
            </button>
            <button type="button" className="secondary-button" onClick={runShort} disabled={actionState.short}>
              <Play className="h-4 w-4" />
              Create Shorts
            </button>
            <button type="button" className="secondary-button" onClick={runLong} disabled={actionState.long}>
              <Video className="h-4 w-4" />
              Create Long Video
            </button>
          </div>
        </div>

        <LiveProjectCard status={status} />
      </div>
    </motion.section>
  );
}

function OverviewGrid({ status, news, expanded = false }) {
  const items = [
    { label: "Current Stage", value: status.progressLabel || "Idle", subtext: status.currentTask, icon: BrainCircuit },
    { label: "Overall Progress", value: `${status.overallProgress || 0}%`, subtext: stageSubtext(status), icon: Activity },
    { label: "Upload Queue", value: `${status.queue?.queue_length || 0}`, subtext: `${status.queue?.failed_jobs?.length || 0} failed jobs`, icon: Upload },
    { label: "Trending Sports", value: `${news.length}`, subtext: "Live story candidates ready", icon: Newspaper },
  ];

  return (
    <section className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-4"}`}>
      {items.map((item) => (
        <div key={item.label} className="studio-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-main)]">{item.value}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.subtext}</p>
            </div>
            <item.icon className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
        </div>
      ))}
    </section>
  );
}

function LiveStudio({ status, logs, expanded = false }) {
  return (
    <section className={`grid gap-6 ${expanded ? "xl:grid-cols-1" : "xl:grid-cols-[1.05fr_0.95fr]"}`}>
      <div className="studio-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">AI Activity</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Live production feed</h3>
          </div>
          <div className="pulse-chip">{status.running ? "Live" : status.failed ? "Issue" : "Ready"}</div>
        </div>
        <div className="mt-6 space-y-3">
          {status.activityFeed?.length ? (
            status.activityFeed
              .slice()
              .reverse()
              .slice(0, 10)
              .map((item) => <ActivityItem key={item.id} item={item} />)
          ) : (
            <div className="empty-state">The AI activity feed will appear here as soon as a run starts.</div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <StageBoard status={status} />
        <LogCard logs={logs} />
      </div>
    </section>
  );
}

function QueueAndAlerts({ status, expanded = false }) {
  return (
    <section className={`grid gap-6 ${expanded ? "xl:grid-cols-1" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
      <div className="studio-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Upload Queue</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Jobs and retries</h3>
          </div>
          <RefreshCcw className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <QueueStat label="Active" value={status.queue?.current_job ? "1" : "0"} />
          <QueueStat label="Queued" value={`${status.queue?.queue_length || 0}`} />
          <QueueStat label="Retries" value={`${status.retryCount || 0}`} />
        </div>
        <div className="mt-6 space-y-3">
          {(status.queue?.queued_jobs || []).slice(0, 4).map((job) => (
            <div key={job.id} className="queue-row">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{job.mode} job</p>
                <p className="text-xs text-[var(--text-secondary)]">{job.current_task}</p>
              </div>
              <span className="badge">{job.status}</span>
            </div>
          ))}
          {!status.queue?.queued_jobs?.length ? <div className="empty-state">No queued jobs right now.</div> : null}
        </div>
      </div>

      <div className="studio-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Notification Center</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Frontend alerts and summaries</h3>
          </div>
          <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <div className="mt-6 space-y-3">
          {status.notifications?.length ? (
            status.notifications
              .slice()
              .reverse()
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="feed-row">
                  <div className="status-dot status-dot-accent mt-1" />
                  <div>
                    <p className="text-sm text-[var(--text-main)]">{item.message}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatTimestamp(item.timestamp)}</p>
                  </div>
                </div>
              ))
          ) : (
            <div className="empty-state">Automation alerts will show up here in real time.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function SportsNewsPanel({ news, status, expanded = false }) {
  return (
    <section className={`grid gap-6 ${expanded ? "xl:grid-cols-1" : "xl:grid-cols-[1fr_0.9fr]"}`}>
      <div className="studio-card p-6">
        <p className="section-kicker">Trending Sports</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Stories the AI can turn into videos</h3>
        <div className="mt-6 grid gap-4">
          {news.slice(0, 8).map((item) => (
            <div key={item.id} className="news-row">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{item.title}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.summary}</p>
              </div>
              <span className="badge">{item.category}</span>
            </div>
          ))}
        </div>
      </div>
      <LiveProjectCard status={status} />
    </section>
  );
}

function UploadControlCenter({ status, expanded = false }) {
  return (
    <section className={`grid gap-6 ${expanded ? "xl:grid-cols-1" : "xl:grid-cols-[1fr_1fr]"}`}>
      <div className="studio-card p-6">
        <p className="section-kicker">Upload Monitor</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Know exactly when YouTube upload starts, moves, or fails</h3>
        <div className="mt-6">
          <ProgressBlock
            title={status.uploadStatus?.variant ? `${status.uploadStatus.variant} upload` : "Upload status"}
            subtitle={status.uploadStatus?.message || "Waiting to upload"}
            progress={status.uploadStatus?.progress || 0}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <QueueStat label="Platform" value={status.uploadStatus?.platform || "YouTube"} />
            <QueueStat label="ETA" value={formatEta(status.uploadStatus?.eta_seconds)} />
            <QueueStat label="Link" value={status.youtubeLinks?.[0]?.url ? "Ready" : "Pending"} />
          </div>
        </div>
      </div>
      <div className="studio-card p-6">
        <p className="section-kicker">Rendered Videos</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Latest previews and publish links</h3>
        <div className="mt-6 space-y-4">
          {(status.previewItems || []).map((item) => (
            <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="preview-row">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.variant === "short" ? "Vertical Shorts preview" : "Long-form preview"}</p>
              </div>
              <span className="badge">Open</span>
            </a>
          ))}
          {(status.youtubeLinks || []).map((item) => (
            <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="preview-row">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.url}</p>
              </div>
              <span className="badge">Published</span>
            </a>
          ))}
          {!status.previewItems?.length && !status.youtubeLinks?.length ? <div className="empty-state">No previews or upload links yet.</div> : null}
        </div>
      </div>
    </section>
  );
}

function ThumbnailPanel({ status }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="studio-card p-6">
        <p className="section-kicker">Thumbnail Preview</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Automatic thumbnail output</h3>
        {status.thumbnailUrl ? <img src={status.thumbnailUrl} alt={status.thumbnailText || "Thumbnail"} className="thumbnail-preview mt-6" /> : <div className="empty-state mt-6">No thumbnail preview yet.</div>}
      </div>
      <div className="studio-card p-6">
        <p className="section-kicker">Creative Direction</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status.thumbnailText || "Thumbnail text will appear here"}</h3>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          The platform generates a thumbnail automatically, then attaches it to the video package so the AI studio and Telegram updates stay aligned.
        </p>
      </div>
    </section>
  );
}

function SettingsPanel({ dashboard, runtime, actionState }) {
  const [form, setForm] = useState({
    telegramBotToken: runtime.telegramBotToken || "",
    telegramChatId: runtime.telegramChatId || "",
    enableNotifications: runtime.enableNotifications,
  });

  useEffect(() => {
    setForm({
      telegramBotToken: runtime.telegramBotToken || "",
      telegramChatId: runtime.telegramChatId || "",
      enableNotifications: runtime.enableNotifications,
    });
  }, [runtime]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="studio-card p-6">
        <p className="section-kicker">Telegram Settings</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Easy notification controls</h3>
        <div className="mt-6 grid gap-4">
          <label className="settings-field">
            <span>Bot Token</span>
            <input
              className="creator-input h-[56px]"
              value={form.telegramBotToken}
              onChange={(event) => setForm((prev) => ({ ...prev, telegramBotToken: event.target.value }))}
              placeholder="Telegram bot token"
            />
          </label>
          <label className="settings-field">
            <span>Chat ID</span>
            <input
              className="creator-input h-[56px]"
              value={form.telegramChatId}
              onChange={(event) => setForm((prev) => ({ ...prev, telegramChatId: event.target.value }))}
              placeholder="Telegram chat ID"
            />
          </label>
          <label className="toggle-row">
            <span>Enable Notifications</span>
            <input
              type="checkbox"
              checked={form.enableNotifications}
              onChange={(event) => setForm((prev) => ({ ...prev, enableNotifications: event.target.checked }))}
            />
          </label>
          <button
            type="button"
            className="secondary-button w-fit"
            onClick={() =>
              dashboard.saveRuntimeSettings({
                telegram_bot_token: form.telegramBotToken,
                telegram_chat_id: form.telegramChatId,
                enable_notifications: form.enableNotifications,
              })
            }
            disabled={actionState.saveSettings}
          >
            {actionState.saveSettings ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Telegram Settings
          </button>
          <button type="button" className="primary-button w-fit" onClick={dashboard.sendTelegramTest} disabled={actionState.telegram}>
            {actionState.telegram ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Test Alert
          </button>
        </div>
      </div>
      <div className="studio-card p-6">
        <p className="section-kicker">Studio Preferences</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Automation defaults</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <QueueStat label="Default Language" value={runtime.defaultLanguage === "te" ? "Telugu" : "English"} />
          <QueueStat label="Default Mode" value={runtime.defaultMode || "full"} />
          <QueueStat label="Short Duration" value={`${runtime.shortVideoDuration}s`} />
          <QueueStat label="Long Duration" value={`${runtime.longVideoDuration}s`} />
        </div>
      </div>
    </section>
  );
}

function LiveProjectCard({ status }) {
  return (
    <div className="studio-card p-6">
      <p className="section-kicker">Live Project</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status.selectedTopic || "Waiting for the next video topic"}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{status.selectedTopicSummary || "The studio will research, script, render, validate, and upload the next sports story automatically."}</p>

      <div className="mt-6 space-y-4">
        <ProgressBlock title="Overall production" subtitle={status.currentTask} progress={status.overallProgress || 0} />
        <ProgressBlock title="Rendering" subtitle={status.renderStatus?.message || "Waiting"} progress={status.renderStatus?.progress || 0} />
        <ProgressBlock title="Uploading" subtitle={status.uploadStatus?.message || "Waiting"} progress={status.uploadStatus?.progress || 0} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <QueueStat label="ETA" value={formatEta(status.etaSeconds)} />
        <QueueStat label="Retries" value={`${status.retryCount || 0}/${status.maxRetries || 0}`} />
      </div>
    </div>
  );
}

function StageBoard({ status }) {
  return (
    <div className="studio-card p-6">
      <p className="section-kicker">Production Stages</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Real-time progress board</h3>
      <div className="mt-6 grid gap-3">
        {(status.stages || []).map((stage) => (
          <div key={stage.key} className="stage-row">
            <div>
              <p className="text-sm font-medium text-[var(--text-main)]">{stage.icon} {stage.label}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{stage.message || "Waiting to start"}</p>
            </div>
            <div className="stage-meter">
              <div className="stage-meter-bar" style={{ width: `${stage.progress || 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogCard({ logs }) {
  return (
    <div className="studio-card p-6">
      <p className="section-kicker">Latest Logs</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Recent system messages</h3>
      <div className="mt-6 space-y-3">
        {(logs || []).slice().reverse().slice(0, 7).map((item) => (
          <div key={item.id} className="feed-row">
            <div className={`status-dot ${item.level === "error" ? "status-dot-danger" : item.level === "success" ? "status-dot-success" : "status-dot-accent"} mt-1`} />
            <div>
              <p className="text-sm text-[var(--text-main)]">{item.message}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.timestampLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  return (
    <div className="feed-row">
      <div className="activity-icon">{item.icon || "•"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-main)]">{item.message}</p>
          <span className="text-xs text-[var(--text-secondary)]">{formatTimestamp(item.timestamp)}</span>
        </div>
        {typeof item.progress === "number" ? (
          <div className="mini-progress mt-2">
            <div className="mini-progress-bar" style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
      </div>
    </div>
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

function QueueStat({ label, value }) {
  return (
    <div className="queue-stat">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function stageSubtext(status) {
  if (typeof status.etaSeconds === "number" && status.etaSeconds > 0) {
    return `ETA ${formatEta(status.etaSeconds)}`;
  }
  return status.failed ? "Needs attention" : status.running ? "Live now" : "Ready to start";
}

function formatEta(value) {
  if (typeof value !== "number" || value <= 0) {
    return "Ready";
  }
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatTimestamp(value) {
  if (!value) {
    return "Live";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
