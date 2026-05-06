import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CirclePlay,
  Clock3,
  Film,
  Flame,
  Globe,
  LoaderCircle,
  Mic2,
  Newspaper,
  RefreshCcw,
  Sparkles,
  Star,
  Trophy,
  Upload,
  WandSparkles,
  Youtube,
} from "lucide-react";
import { motion } from "framer-motion";

const sportOptions = [
  { key: "cricket", label: "Cricket", icon: Trophy },
  { key: "football", label: "Football", icon: Trophy },
  { key: "kabaddi", label: "Kabaddi", icon: Activity },
  { key: "all", label: "All Sports", icon: Globe },
];

const quickActions = [
  { label: "Make Shorts Now", icon: Sparkles, tone: "from-sky-500/30 to-sky-300/10" },
  { label: "Make Full Video", icon: Film, tone: "from-emerald-500/25 to-emerald-300/10" },
  { label: "Create Cool Thumbnail", icon: Star, tone: "from-amber-500/25 to-amber-300/10" },
  { label: "Find Trending Sports", icon: Flame, tone: "from-rose-500/25 to-rose-300/10" },
  { label: "Upload to YouTube", icon: Youtube, tone: "from-red-500/25 to-red-300/10" },
  { label: "Surprise Me", icon: WandSparkles, tone: "from-indigo-500/25 to-indigo-300/10" },
];

const automationToggles = [
  "Auto-create daily videos",
  "Auto research trending sports",
  "Auto make Telugu voice",
  "Auto upload to YouTube",
  "Auto create thumbnails",
];

const friendlyFeed = [
  { icon: Newspaper, label: "Researching cricket matches", progress: 88 },
  { icon: Sparkles, label: "Writing exciting script", progress: 72 },
  { icon: Mic2, label: "Creating Telugu voiceover", progress: 61 },
  { icon: Star, label: "Making awesome thumbnail", progress: 46 },
  { icon: Film, label: "Rendering video", progress: 33 },
];

export default function DashboardPage({ dashboard, currentPath }) {
  const { status, news, logs, runtime, actionState, metrics } = dashboard;

  if (!status || !runtime) {
    return <div className="empty-state">Loading CreatorOS and getting your sports video studio ready...</div>;
  }

  const pages = {
    "/dashboard": <DashboardHome dashboard={dashboard} />,
    "/video-generator": <DashboardHome dashboard={dashboard} focus="create" />,
    "/sports-news": <DashboardHome dashboard={dashboard} focus="trending" />,
    "/ai-content": <DashboardHome dashboard={dashboard} focus="activity" />,
    "/uploads": <DashboardHome dashboard={dashboard} focus="uploads" />,
    "/analytics": <DashboardHome dashboard={dashboard} focus="analytics" />,
    "/automation": <DashboardHome dashboard={dashboard} focus="automation" />,
    "/thumbnails": <DashboardHome dashboard={dashboard} focus="recent" />,
    "/settings": <SettingsSpotlight runtime={runtime} status={status} logs={logs} metrics={metrics} />,
  };

  return <div className="space-y-6">{pages[currentPath] || pages["/dashboard"]}</div>;
}

function DashboardHome({ dashboard, focus = "home" }) {
  const { status, news, logs, runtime, metrics } = dashboard;
  const liveFeed = status.activityFeed?.length
    ? status.activityFeed.slice().reverse().slice(0, 5).map((item, index) => ({
        id: item.id || `feed-${index}`,
        label: item.message,
        progress: typeof item.progress === "number" ? item.progress : Math.max(18, 90 - index * 14),
        icon: [Newspaper, Sparkles, Mic2, Star, Film][index] || Sparkles,
        time: formatTimestamp(item.timestamp),
      }))
    : friendlyFeed.map((item, index) => ({ ...item, id: `friendly-${index}`, time: "Live now" }));

  const recentVideos = (status.previewItems?.length ? status.previewItems : buildFallbackVideos(status.selectedTopic)).slice(0, 4);
  const uploads = buildUploadQueue(status);
  const trends = (news?.length ? news : buildFallbackNews()).slice(0, 6);
  const analytics = buildAnalytics(status, metrics);

  return (
    <>
      <HeroSection dashboard={dashboard} />
      <QuickActions dashboard={dashboard} />
      <FocusStrip focus={focus} />
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <LiveActivityPanel items={liveFeed} />
        <RecentVideosPanel videos={recentVideos} status={status} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <UploadQueuePanel uploads={uploads} />
        <TrendingSportsPanel trends={trends} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AutomationPanel runtime={runtime} />
        <AnalyticsPanel analytics={analytics} logs={logs} />
      </section>
    </>
  );
}

function HeroSection({ dashboard }) {
  const { status, language, setLanguage, promptInput, setPromptInput, runNow, runShort, runLong, generateAutoPrompt, actionState } = dashboard;

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-creator creator-hero-premium">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className="badge badge-primary">AI-Powered Sports Video Studio</span>
            <span className="badge">{status.running ? "AI is Ready" : "Tap to begin"}</span>
            <span className="badge">{language === "te" ? "తెలుగు mode" : "English mode"}</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-5xl xl:text-6xl">
              What do you want to create today?
            </h2>
            <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Create sports highlights, YouTube Shorts, match recap videos, and thumbnails in a clean AI studio that feels simple from the first tap.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-zinc-900/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-5">
            <div className="grid gap-4">
              <textarea
                className="creator-input min-h-[160px] text-base sm:text-lg"
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="E.g., Virat Kohli winning six, or IPL highlights..."
              />

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Pick a sport</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sportOptions.map((sport) => (
                      <button key={sport.key} type="button" className="selector-card">
                        <sport.icon className="h-6 w-6 text-sky-300" />
                        <span>{sport.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Choose video type</p>
                  <div className="grid gap-3">
                    <button type="button" className="selector-card justify-between" onClick={runShort} disabled={actionState.short}>
                      <span>Shorts</span>
                      <span className="text-xs text-[var(--text-secondary)]">15-60 sec</span>
                    </button>
                    <button type="button" className="selector-card justify-between" onClick={runLong} disabled={actionState.long}>
                      <span>Full Video</span>
                      <span className="text-xs text-[var(--text-secondary)]">Big story</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Pick language</p>
                  <div className="grid gap-3">
                    <button type="button" className={`selector-card justify-between ${language === "en" ? "selector-card-active" : ""}`} onClick={() => setLanguage("en")}>
                      <span>English</span>
                      <BadgeCheck className="h-5 w-5 text-sky-300" />
                    </button>
                    <button type="button" className={`selector-card justify-between ${language === "te" ? "selector-card-active" : ""}`} onClick={() => setLanguage("te")}>
                      <span>తెలుగు</span>
                      <BadgeCheck className="h-5 w-5 text-sky-300" />
                    </button>
                    <button type="button" className="selector-card justify-between" onClick={generateAutoPrompt} disabled={actionState.prompt}>
                      <span>Auto</span>
                      {actionState.prompt ? <LoaderCircle className="h-5 w-5 animate-spin text-sky-300" /> : <WandSparkles className="h-5 w-5 text-sky-300" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" className="primary-button hero-generate-button min-h-[60px] px-7 text-base" onClick={runNow} disabled={actionState.auto}>
                  {actionState.auto ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Generate Magic Video
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
          <div className="studio-card overflow-hidden p-6">
            <div className="absolute inset-x-6 top-0 h-24 rounded-b-full bg-sky-400/10 blur-3xl" />
            <p className="section-kicker">Live Status</p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">
              {status.selectedTopic || "Your next sports highlight video is ready to begin"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {status.selectedTopicSummary || "Type a sports idea above and CreatorOS will help research it, write it, voice it, design it, and get it ready to publish."}
            </p>
            <div className="mt-6 space-y-4">
              <ProgressBlock title="Video magic progress" subtitle={status.currentTask} progress={status.overallProgress || 18} />
              <ProgressBlock title="Rendering" subtitle={status.renderStatus?.message || "Getting things ready"} progress={status.renderStatus?.progress || 34} />
              <ProgressBlock title="Uploading" subtitle={status.uploadStatus?.message || "Waiting for publish time"} progress={status.uploadStatus?.progress || 12} />
            </div>
          </div>

          <div className="studio-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Happy Numbers</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">You are growing fast</h3>
              </div>
              <div className="rounded-full border border-sky-400/20 bg-sky-400/10 p-3 text-sky-300">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <StatPill label="Views" value={status.youtubeLinks?.length ? "12.4K" : "2.8K"} />
              <StatPill label="Videos Made" value={`${status.previewItems?.length || 8}`} />
              <StatPill label="Watch Time" value="38 hrs" />
              <StatPill label="This Week" value="+24%" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function QuickActions({ dashboard }) {
  const actionMap = [
    dashboard.runShort,
    dashboard.runLong,
    dashboard.generateAutoPrompt,
    dashboard.refreshStatus,
    dashboard.runNow,
    dashboard.generateAutoPrompt,
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {quickActions.map((action, index) => (
        <motion.button
          key={action.label}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          className={`quick-action-card bg-gradient-to-br ${action.tone}`}
          onClick={actionMap[index]}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[var(--text-main)]">
            <action.icon className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-main)]">{action.label}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">One big tap. CreatorOS will guide the rest.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-sky-300" />
        </motion.button>
      ))}
    </section>
  );
}

function FocusStrip({ focus }) {
  const labels = {
    home: "Everything you need is right here.",
    create: "You are in create mode. Pick an idea and hit the big blue button.",
    trending: "Fresh sports stories are ready below.",
    activity: "Watch the AI studio work in real time.",
    uploads: "Your upload lane is ready and easy to follow.",
    analytics: "Your happy numbers and charts are waiting below.",
    automation: "Friendly switches help your studio run by itself.",
  };

  return (
    <div className="studio-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--text-main)]">Friendly guide</p>
          <p className="text-sm text-[var(--text-secondary)]">{labels[focus] || labels.home}</p>
        </div>
      </div>
      <span className="badge badge-success">Simple and ready for everyone</span>
    </div>
  );
}

function LiveActivityPanel({ items }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">What AI is doing right now...</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Live AI Activity Feed</h3>
        </div>
        <span className="pulse-chip">Live</span>
      </div>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="feed-row">
            <div className="activity-icon">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                <span className="text-xs text-[var(--text-secondary)]">{item.time}</span>
              </div>
              <div className="mini-progress mt-3">
                <div className="mini-progress-bar creator-accent-bar" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentVideosPanel({ videos, status }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Recent Videos</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Your latest creations</h3>
        </div>
        <span className="badge">{status.running ? "Making more now" : "Ready to watch"}</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {videos.map((video, index) => (
          <motion.div key={video.label || index} whileHover={{ y: -4 }} className="video-showcase-card">
            <div className="video-showcase-thumb">
              <div className="play-overlay">
                <CirclePlay className="h-5 w-5" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-sky-300/10" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{video.label || `Sports video ${index + 1}`}</p>
                  <p className="mt-1 text-xs text-white/75">{video.variant === "short" ? "Shorts" : "Full Video"}</p>
                </div>
                <span className="badge badge-success">{video.status || "Ready"}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <MetricMini label="Views" value={video.views || "8.1K"} />
              <MetricMini label="Likes" value={video.likes || "1.2K"} />
              <MetricMini label="State" value={video.status || "Done"} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function UploadQueuePanel({ uploads }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">YouTube Upload Queue</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Easy upload tracking</h3>
        </div>
        <Upload className="h-5 w-5 text-sky-300" />
      </div>
      <div className="mt-6 space-y-4">
        {uploads.map((item) => (
          <div key={item.id} className="queue-row">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-main)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
              </div>
              <span className="badge">{item.eta}</span>
            </div>
            <div className="mini-progress mt-4">
              <div className="mini-progress-bar creator-accent-bar" style={{ width: `${item.progress}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="secondary-button min-h-[52px] px-5">Retry</button>
              <button type="button" className="secondary-button min-h-[52px] px-5">Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendingSportsPanel({ trends }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Trending Sports</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Trending sports stories to turn into videos</h3>
        </div>
        <Flame className="h-5 w-5 text-amber-300" />
      </div>
      <div className="mt-6 grid gap-4">
        {trends.map((item, index) => (
          <div key={item.id || index} className="news-row">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-warning">{item.category || "Sports"}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{item.publishedAt || "Just now"}</span>
                </div>
                <p className="mt-3 text-base font-semibold text-[var(--text-main)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.summary}</p>
              </div>
              <button type="button" className="primary-button min-h-[56px] px-5 text-sm">Make Video</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AutomationPanel({ runtime }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Smart Automation</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Friendly auto helper</h3>
        </div>
        <RefreshCcw className="h-5 w-5 text-emerald-300" />
      </div>
      <div className="mt-6 space-y-3">
        {automationToggles.map((label, index) => {
          const enabled = [
            true,
            true,
            runtime.defaultLanguage === "te",
            runtime.enableUpload,
            true,
          ][index];
          return (
            <div key={label} className={`toggle-card ${enabled ? "toggle-card-on" : ""}`}>
              <div>
                <p className="text-base font-semibold text-[var(--text-main)]">{label}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{enabled ? "On and helping you" : "Off for now"}</p>
              </div>
              <div className={`toggle-switch ${enabled ? "toggle-switch-on" : ""}`}>
                <div className="toggle-knob" style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnalyticsPanel({ analytics, logs }) {
  return (
    <section className="studio-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">My Performance</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text-main)]">Simple YouTube growth analytics</h3>
        </div>
        <Clock3 className="h-5 w-5 text-sky-300" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {analytics.map((item) => (
          <div key={item.label} className="queue-stat">
            <p className="text-sm text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-3 text-3xl font-extrabold text-[var(--text-main)]">{item.value}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-end gap-3">
          {[42, 66, 58, 82, 76, 96, 88].map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-full bg-white/5 p-1">
                <div className="rounded-full bg-gradient-to-t from-sky-500 to-white/90" style={{ height: `${value}px` }} />
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-semibold text-[var(--text-main)]">Latest good news</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {logs?.slice().reverse().find((item) => item.level !== "error")?.message || "Your studio is ready to keep creating."}
        </p>
      </div>
    </section>
  );
}

function SettingsSpotlight({ runtime, status, logs, metrics }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="studio-card p-6">
        <p className="section-kicker">Studio Settings</p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--text-main)]">Clean studio settings for faster video creation</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatPill label="Main Language" value={runtime.defaultLanguage === "te" ? "తెలుగు" : "English"} />
          <StatPill label="Video Style" value={runtime.defaultMode || "full"} />
          <StatPill label="Short Length" value={`${runtime.shortVideoDuration}s`} />
          <StatPill label="Long Length" value={`${runtime.longVideoDuration}s`} />
          <StatPill label="Upload" value={runtime.enableUpload ? "On" : "Off"} />
          <StatPill label="Alerts" value={runtime.enableNotifications ? "On" : "Off"} />
        </div>
      </div>
      <div className="studio-card p-6">
        <p className="section-kicker">Studio Snapshot</p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--text-main)]">{status.statusLabel}</h3>
        <div className="mt-6 space-y-4">
          <ProgressBlock title="Overall progress" subtitle={status.currentTask} progress={status.overallProgress || 12} />
          <StatPill label="Stories Found" value={`${metrics.newsCount}`} />
          <StatPill label="Videos Ready" value={`${metrics.videoCount}`} />
          <StatPill label="Uploads Done" value={`${metrics.uploadCount}`} />
        </div>
        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-[var(--text-main)]">Latest message</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{logs?.slice(-1)?.[0]?.message || "Your studio is calm and ready."}</p>
        </div>
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
        <div className="progress-bar creator-accent-bar" style={{ width: `${progress}%` }} />
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

function MetricMini({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function buildFallbackVideos(topic) {
  return [
    { label: topic || "Virat Kohli Mega Six", variant: "short", status: "Ready", views: "12K", likes: "2.3K" },
    { label: "IPL Night Highlights", variant: "long", status: "Uploading", views: "8.8K", likes: "1.1K" },
    { label: "Football Goal Story", variant: "short", status: "Done", views: "6.4K", likes: "914" },
    { label: "Top Kabaddi Moments", variant: "long", status: "Ready", views: "5.2K", likes: "802" },
  ];
}

function buildUploadQueue(status) {
  const queued = status.queue?.queued_jobs?.slice(0, 3) || [];
  if (queued.length) {
    return queued.map((job, index) => ({
      id: job.id || `upload-${index}`,
      title: `${job.mode === "short" ? "Shorts" : "Full video"} upload`,
      message: job.current_task || "Preparing your upload",
      progress: Math.max(16, 32 + index * 21),
      eta: `${index + 1} min left`,
    }));
  }
  return [
    { id: "u1", title: "Virat Kohli Highlights", message: "Sending your video to YouTube", progress: 74, eta: "1 min left" },
    { id: "u2", title: "Telugu Match Recap", message: "Checking title and thumbnail", progress: 38, eta: "3 min left" },
  ];
}

function buildFallbackNews() {
  return [
    { id: "n1", category: "Cricket", title: "Virat Kohli lights up the chase with a huge finish", summary: "A strong cricket highlight story for YouTube Shorts, match recap videos, and fast fan reactions." },
    { id: "n2", category: "Football", title: "Last-minute goal sends the crowd wild", summary: "A dramatic football moment that fits short-form videos, thumbnails, and creator commentary." },
    { id: "n3", category: "Kabaddi", title: "Star raider pulls off a stunning comeback", summary: "A high-energy sports story with clear action, simple narration, and strong video potential." },
  ];
}

function buildAnalytics(status, metrics) {
  return [
    { label: "Total Views 👀", value: status.youtubeLinks?.length ? "126K" : "24.8K", note: "Your sports video content is reaching more viewers." },
    { label: "Videos Made 🎥", value: `${Math.max(8, metrics.videoCount || 0)}`, note: "CreatorOS keeps your content pipeline moving." },
    { label: "Watch Time ⏱️", value: "312 hrs", note: "People are staying longer on your YouTube videos." },
    { label: "Growth this week 📈", value: "+31%", note: "Your channel momentum is moving in the right direction." },
  ];
}

function formatTimestamp(value) {
  if (!value) return "Live now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
