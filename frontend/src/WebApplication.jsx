import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  Copy,
  FileText,
  Globe,
  LayoutDashboard,
  Newspaper,
  PlayCircle,
  Rocket,
  Settings,
  Sparkles,
  TerminalSquare,
  Tv,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardData } from "./hooks/useDashboardData";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Live News", icon: Newspaper },
  { label: "Script Generator", icon: Sparkles },
  { label: "Video Manager", icon: PlayCircle },
  { label: "Logs", icon: TerminalSquare },
  { label: "Settings", icon: Settings },
];

const statCards = [
  { key: "news", label: "News Fetched", icon: Newspaper, suffix: "Today", accent: "cyan" },
  { key: "scripts", label: "Scripts Generated", icon: FileText, suffix: "Today", accent: "violet" },
  { key: "videos", label: "Videos Created", icon: Video, suffix: "Today", accent: "amber" },
  { key: "uploaded", label: "Videos Uploaded", icon: Tv, suffix: "Today", accent: "emerald" },
];

const logTone = {
  info: "text-sky-300",
  success: "text-emerald-300",
  error: "text-rose-300",
};

const newsTagTone = {
  cricket: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  football: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
};

export default function WebApplication() {
  const {
    loading,
    error,
    status,
    news,
    logs,
    askAiResult,
    language,
    setLanguage,
    actionState,
    runNow,
    askAi,
  } = useDashboardData();
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const terminalRef = useRef(null);

  const computedStats = useMemo(() => {
    const uploaded = (status?.youtubeLinks || []).length;
    const videos = (status?.previewItems || []).length;
    const scripts = askAiResult?.script ? 1 : status?.selectedTopic ? 1 : 0;
    return {
      news: news.length,
      scripts,
      videos,
      uploaded,
    };
  }, [askAiResult, news.length, status?.previewItems, status?.selectedTopic, status?.youtubeLinks]);

  useEffect(() => {
    setVisibleLogs(logs || []);
  }, [logs]);

  useEffect(() => {
    if (!autoScroll || !terminalRef.current) {
      return;
    }
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [autoScroll, visibleLogs]);

  async function handleGenerateScript() {
    if (!prompt.trim()) {
      return;
    }
    await askAi({ topic: prompt, generate_video: false });
  }

  async function handleGenerateVideo() {
    if (!prompt.trim()) {
      return;
    }
    await askAi({ topic: prompt, generate_video: true });
  }

  async function handleCopy() {
    const text = [askAiResult?.title, askAiResult?.script, askAiResult?.video_prompt].filter(Boolean).join("\n\n");
    if (!text || !navigator?.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[10%] top-[5%] h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-[30%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:84px_84px] opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 flex-col rounded-[28px] border border-white/10 bg-panel/90 p-5 shadow-panel backdrop-blur xl:flex">
          <div className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#3b82f6,#22c55e)] shadow-[0_12px_30px_rgba(34,211,238,0.28)]">
              <Bot className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI SPORTS</p>
              <h1 className="text-xl font-semibold leading-6 text-white">Automation</h1>
            </div>
          </div>

          <nav className="mt-7 space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = index === 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition duration-300 ${
                    active
                      ? "border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.18),rgba(34,197,94,0.16))] text-white shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_12px_32px_rgba(15,23,42,0.4)]"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-cyan-300" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[24px] border border-violet-400/20 bg-[linear-gradient(180deg,rgba(76,29,149,0.18),rgba(17,24,39,0.4))] p-4">
            <p className="text-sm font-medium text-white">Today's Progress</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <ProgressRow label="Videos Created" value={`${computedStats.videos} / 5`} />
              <ProgressRow label="Scripts Generated" value={`${computedStats.scripts} / 5`} />
              <ProgressRow label="Uploaded" value={`${computedStats.uploaded}`} />
              <ProgressRow label="Remaining" value={`${Math.max(0, 5 - computedStats.uploaded)}`} />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <header className="glass-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-4xl">
                AI Sports <span className="bg-[linear-gradient(135deg,#22d3ee,#22c55e)] bg-clip-text text-transparent">Automation Studio</span>
              </h2>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                Create and upload sports videos automatically to YouTube
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={status?.status} />
              <label className="glass-pill min-w-[170px] cursor-pointer justify-between">
                <span className="inline-flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-300" />
                  {language === "en" ? "English" : "Telugu"}
                </span>
                <select className="absolute inset-0 cursor-pointer opacity-0" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="te">Telugu</option>
                  <option value="en">English</option>
                </select>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </label>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Bell className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </header>

          <section className="glass-card overflow-hidden p-0">
            <div className="grid gap-0 xl:grid-cols-[1.65fr_0.75fr]">
              <div className="hero-grid p-6">
                <div className="hero-orb flex min-h-[220px] items-center justify-center rounded-[28px] border border-cyan-400/20">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/50">
                    <div className="absolute inset-4 rounded-full border border-cyan-400/20" />
                    <div className="absolute -right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/25 text-violet-200 shadow-glow-violet">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="absolute -left-4 bottom-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-200 shadow-glow-cyan">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="absolute bottom-[-10px] left-1/2 h-8 w-28 -translate-x-1/2 rounded-full bg-cyan-400/25 blur-xl" />
                    <Bot className="h-16 w-16 text-cyan-300" />
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <h1 className="text-4xl font-semibold uppercase tracking-tight text-white sm:text-5xl">
                    AI Sports <span className="hero-gradient-text">Automation</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                    Generate script, create video and upload automatically with a premium AI workflow built for sports content.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="glass-pill min-w-[180px] justify-between">
                      <span>{language === "en" ? "English" : "Telugu"}</span>
                      <select
                        className="absolute inset-0 cursor-pointer opacity-0"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        disabled={Boolean(status?.running) || actionState.run}
                      >
                        <option value="te">Telugu</option>
                        <option value="en">English</option>
                      </select>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </label>

                    <button
                      type="button"
                      onClick={runNow}
                      disabled={Boolean(status?.running) || actionState.run}
                      className="start-button"
                    >
                      <Rocket className={`h-5 w-5 ${Boolean(status?.running) || actionState.run ? "animate-spin" : ""}`} />
                      <span>{Boolean(status?.running) || actionState.run ? "STARTING..." : "START AUTOMATION"}</span>
                    </button>
                  </div>

                  <p className="mt-4 text-sm text-slate-400">Click to start the full automation process</p>
                  {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
                </div>
              </div>

              <div className="border-t border-white/8 p-6 xl:border-l xl:border-t-0">
                <p className="text-lg font-semibold text-white">Current Status</p>
                <div className="mt-5 flex items-center gap-5">
                  <div className="progress-ring">
                    <div className="progress-ring__inner">
                      <span className="text-3xl font-semibold text-white">{getProgressValue(status)}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["Fetching News", "Script Generation", "Voice Over", "Video Creation", "Uploading", "Completed"].map((step, index) => {
                      const activeIndex = getStatusStepIndex(status);
                      return <StatusStep key={step} label={step} active={index <= activeIndex} current={index === activeIndex} />;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className="glass-card p-5 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`stat-icon stat-icon--${card.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-emerald-300">+{12 + index * 4}%</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">{card.label}</p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-semibold text-white">{computedStats[card.key]}</span>
                    <span className="pb-1 text-sm text-slate-500">{card.suffix}</span>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.08fr_1fr_1.02fr]">
            <div className="glass-card p-5">
              <SectionHeader title="Live Sports News" action="View All" />
              <div className="mt-5 space-y-4">
                {(loading ? Array.from({ length: 3 }) : news.slice(0, 3)).map((item, index) =>
                  loading ? (
                    <div key={index} className="animate-pulse rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                      <div className="h-24 rounded-2xl bg-white/10" />
                    </div>
                  ) : (
                    <article key={item.id} className="news-item">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-24 w-32 rounded-2xl object-cover" />
                      ) : (
                        <div className="news-image-fallback">
                          <Newspaper className="h-6 w-6 text-cyan-200" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-lg font-medium text-white">{item.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full border px-3 py-1 ${newsTagTone[(item.category || "").toLowerCase()] || "border-violet-400/30 bg-violet-500/15 text-violet-200"}`}>
                            {item.category || "Sports"}
                          </span>
                          <span className="text-slate-500">{item.source}</span>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </div>

            <div className="glass-card p-5">
              <SectionHeader title="Script Generator" />
              <div className="mt-5">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ask anything about sports..."
                  className="input-surface min-h-[108px] w-full resize-none"
                />
                <button
                  type="button"
                  onClick={handleGenerateScript}
                  disabled={actionState.askAi}
                  className="action-gradient mt-4 w-full"
                >
                  <Sparkles className={`h-4 w-4 ${actionState.askAi ? "animate-spin" : ""}`} />
                  <span>{actionState.askAi ? "Generating..." : "Generate Script"}</span>
                </button>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Generated Script ({status?.languageLabel || (language === "en" ? "English" : "Telugu")})</p>
                  <button type="button" onClick={handleCopy} className="ghost-button" disabled={!askAiResult?.script}>
                    <Copy className="h-4 w-4" />
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="mt-4 min-h-[180px] rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
                    {askAiResult?.script || "Your AI-generated sports script will appear here after you submit a prompt."}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={handleCopy} className="ghost-button" disabled={!askAiResult?.script}>
                    <Copy className="h-4 w-4" />
                    <span>Copy Script</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateVideo}
                    disabled={actionState.askAi}
                    className="action-gradient"
                  >
                    <Video className="h-4 w-4" />
                    <span>Generate Video</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <SectionHeader title="Recent Videos" action="View All" />
              <div className="mt-5 space-y-4">
                {(status?.previewItems || []).length ? (
                  (status.previewItems || []).map((item, index) => (
                    <article key={`${item.label}-${index}`} className="video-item">
                      {status?.thumbnailUrl ? (
                        <img src={status.thumbnailUrl} alt={item.label} className="h-24 w-32 rounded-2xl object-cover" />
                      ) : (
                        <div className="news-image-fallback">
                          <PlayCircle className="h-6 w-6 text-cyan-200" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-lg font-medium text-white">{item.label}</h3>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full border px-3 py-1 ${status?.youtubeLinks?.length ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-amber-400/30 bg-amber-500/15 text-amber-200"}`}>
                            {status?.youtubeLinks?.length ? "Uploaded" : "Processing"}
                          </span>
                          <span className="text-slate-500">{item.variant || "video"}</span>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
                    Recent videos will appear here after the next run.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <TerminalSquare className="h-5 w-5 text-cyan-300" />
                <h3 className="text-xl font-semibold text-white">Live Logs</h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <button
                  type="button"
                  className="text-rose-300 transition hover:text-rose-200"
                  onClick={() => setVisibleLogs([])}
                >
                  Clear Logs
                </button>
                <button type="button" className="glass-pill" onClick={() => setAutoScroll((value) => !value)}>
                  Auto Scroll {autoScroll ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div ref={terminalRef} className="terminal-panel mt-5">
              {visibleLogs.length ? (
                visibleLogs.map((log) => (
                  <div key={log.id} className="grid gap-3 border-b border-white/5 py-2 md:grid-cols-[88px_92px_1fr] md:items-start">
                    <span className="font-mono text-xs text-slate-500">{log.timestamp || "--:--:--"}</span>
                    <span className={`font-mono text-sm font-semibold uppercase ${logTone[log.level] || logTone.info}`}>
                      {log.level || "info"}
                    </span>
                    <p className="font-mono text-sm text-slate-200">{log.message}</p>
                  </div>
                ))
              ) : (
                <p className="font-mono text-sm text-slate-400">Waiting for pipeline activity...</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      {action ? <button className="ghost-button text-sm">{action}</button> : null}
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const running = status === "Running";
  const errored = status === "Error";
  const label = errored ? "Error" : running ? "Running" : status === "Completed" ? "Completed" : "Idle";

  return (
    <div className="glass-pill">
      <span className="text-slate-400">System Status</span>
      <span
        className={`ml-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
          errored
            ? "bg-rose-500/18 text-rose-200"
            : running
              ? "bg-emerald-500/18 text-emerald-200"
              : status === "Completed"
                ? "bg-cyan-500/18 text-cyan-200"
                : "bg-slate-500/18 text-slate-200"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            errored
              ? "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.9)]"
              : running
                ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]"
                : status === "Completed"
                  ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                  : "bg-slate-300"
          }`}
        />
        {label}
      </span>
    </div>
  );
}

function getStatusStepIndex(status) {
  if (status?.failed || status?.status === "Error") {
    return 0;
  }
  const stage = String(status?.currentStage || "").toLowerCase();
  if (status?.status === "Completed") {
    return 5;
  }
  if (stage === "uploading") {
    return 4;
  }
  if (stage === "video_created") {
    return 3;
  }
  if (stage === "voice_generated") {
    return 2;
  }
  if (stage === "script_ready") {
    return 1;
  }
  if (stage === "news_fetched") {
    return 0;
  }
  if (status?.status === "Uploading") {
    return 4;
  }
  if (status?.status === "Running") {
    return 3;
  }
  return 0;
}

function getProgressValue(status) {
  if (status?.failed || status?.status === "Error") {
    return 0;
  }
  const stage = String(status?.currentStage || "").toLowerCase();
  if (status?.status === "Completed") {
    return 100;
  }
  if (stage === "uploading") {
    return 88;
  }
  if (stage === "video_created") {
    return 74;
  }
  if (stage === "voice_generated") {
    return 58;
  }
  if (stage === "script_ready") {
    return 42;
  }
  if (stage === "news_fetched") {
    return 24;
  }
  if (stage === "queued") {
    return 12;
  }
  if (status?.status === "Uploading") {
    return 85;
  }
  if (status?.status === "Running") {
    return 65;
  }
  return 25;
}

function StatusStep({ label, active, current }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-3.5 w-3.5 rounded-full border ${
          current
            ? "border-cyan-300 bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]"
            : active
              ? "border-emerald-300 bg-emerald-400"
              : "border-slate-600 bg-slate-700"
        }`}
      />
      <span className={`${active ? "text-white" : "text-slate-500"}`}>{label}</span>
    </div>
  );
}
