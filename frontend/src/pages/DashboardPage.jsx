import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Filter,
  Flame,
  Globe,
  Grip,
  Languages,
  LoaderCircle,
  Mic2,
  MoreHorizontal,
  Play,
  RefreshCcw,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const chartColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444"];
const columnHelper = createColumnHelper();

const generatorPlatforms = ["YouTube Shorts", "YouTube Long", "Instagram Reels", "X Highlights"];
const voiceOptions = ["ElevenLabs", "OpenAI TTS", "Azure TTS", "Edge TTS"];
const durationOptions = ["45 sec", "60 sec", "3 min", "8 min"];

export default function DashboardPage({ dashboard, currentPath, currentItem }) {
  const { status, news, logs, runtime, language, actionState, metrics, promptInput, generatedPrompt, askAiResult, toasts } = dashboard;
  const [dateFilter, setDateFilter] = useState("30d");
  const [analyticsView, setAnalyticsView] = useState("monthly");
  const [tableQuery, setTableQuery] = useState("");
  const [generatorForm, setGeneratorForm] = useState({
    topic: "",
    prompt: "",
    voice: "ElevenLabs",
    duration: "60 sec",
    platform: "YouTube Shorts",
    language: "te",
  });
  const [settingsForm, setSettingsForm] = useState(runtime);
  const [selectedUpload, setSelectedUpload] = useState(null);

  useEffect(() => {
    setSettingsForm(runtime);
  }, [runtime]);

  useEffect(() => {
    setGeneratorForm((prev) => ({
      ...prev,
      language,
      topic: prev.topic || status?.selectedTopic || news?.[0]?.title || "",
      prompt: prev.prompt || promptInput || "",
    }));
  }, [language, news, promptInput, status?.selectedTopic]);

  const progress = getProgress(status);
  const analytics = useMemo(() => buildAnalyticsData(news, status, metrics, logs), [news, status, metrics, logs]);
  const trendingVideos = useMemo(() => buildTrendingVideos(status, news), [status, news]);
  const uploadRows = useMemo(() => buildUploadRows(status), [status]);
  const activityRows = useMemo(() => buildActivityRows(status, logs), [status, logs]);
  const teamCards = useMemo(() => buildTeams(news), [news]);

  const uploadColumns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Asset",
        cell: (info) => (
          <div className="min-w-[220px]">
            <p className="font-medium text-[var(--text-main)]">{info.getValue()}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{info.row.original.updatedAt}</p>
          </div>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => <span className="badge">{info.getValue()}</span>,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      columnHelper.accessor("progress", {
        header: "Progress",
        cell: (info) => (
          <div className="min-w-[160px]">
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{info.getValue()}%</span>
              <span>{progressMessage(info.row.original.status)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#3B82F6_0%,#22C55E_100%)]" style={{ width: `${info.getValue()}%` }} />
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <div className="flex gap-2">
            <button type="button" className="table-action-button" onClick={() => setSelectedUpload(info.row.original)}>
              Inspect
            </button>
            <button type="button" className="table-action-button">
              {String(info.row.original.status).toLowerCase().includes("complete") ? "Open" : "Retry"}
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const uploadTable = useReactTable({
    data: uploadRows,
    columns: uploadColumns,
    state: { globalFilter: tableQuery },
    onGlobalFilterChange: setTableQuery,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!runtime || !settingsForm) {
    return <div className="empty-state">Loading premium dashboard...</div>;
  }

  const pageMap = {
    "/dashboard": (
      <>
        <HeroBanner currentItem={currentItem} status={status} analytics={analytics} language={language} progress={progress} />
        <StatsStrip metrics={metrics} analytics={analytics} news={news} status={status} />
        <AnalyticsSection
          analytics={analytics}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          analyticsView={analyticsView}
          setAnalyticsView={setAnalyticsView}
        />
        <NewsAndVideoSection news={news} trendingVideos={trendingVideos} />
        <StudioSection
          dashboard={dashboard}
          generatorForm={generatorForm}
          setGeneratorForm={setGeneratorForm}
          runtime={runtime}
          actionState={actionState}
          generatedPrompt={generatedPrompt}
          askAiResult={askAiResult}
        />
        <UploadsSection uploadTable={uploadTable} tableQuery={tableQuery} setTableQuery={setTableQuery} />
        <ActivitySection rows={activityRows} />
      </>
    ),
    "/sports-news": <NewsAndVideoSection news={news} trendingVideos={trendingVideos} expanded />,
    "/ai-content": (
      <StudioSection
        dashboard={dashboard}
        generatorForm={generatorForm}
        setGeneratorForm={setGeneratorForm}
        runtime={runtime}
        actionState={actionState}
        generatedPrompt={generatedPrompt}
        askAiResult={askAiResult}
        expanded
      />
    ),
    "/video-generator": (
      <StudioSection
        dashboard={dashboard}
        generatorForm={generatorForm}
        setGeneratorForm={setGeneratorForm}
        runtime={runtime}
        actionState={actionState}
        generatedPrompt={generatedPrompt}
        askAiResult={askAiResult}
        videoFocus
      />
    ),
    "/uploads": <UploadsSection uploadTable={uploadTable} tableQuery={tableQuery} setTableQuery={setTableQuery} expanded />,
    "/analytics": (
      <AnalyticsSection
        analytics={analytics}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        analyticsView={analyticsView}
        setAnalyticsView={setAnalyticsView}
        expanded
      />
    ),
    "/teams-players": <TeamsSection teamCards={teamCards} news={news} />,
    "/automation": (
      <AutomationSection
        dashboard={dashboard}
        status={status}
        logs={logs}
        runtime={runtime}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        actionState={actionState}
      />
    ),
    "/monetization": <MonetizationSection analytics={analytics} trendingVideos={trendingVideos} />,
    "/settings": (
      <AutomationSection
        dashboard={dashboard}
        status={status}
        logs={logs}
        runtime={runtime}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        actionState={actionState}
        settingsOnly
      />
    ),
  };

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} onDismiss={dashboard.dismissToast} />
      {pageMap[currentPath] || pageMap["/dashboard"]}
      <AnimatePresence>
        {selectedUpload ? <UploadModal upload={selectedUpload} onClose={() => setSelectedUpload(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}

function HeroBanner({ currentItem, status, analytics, language, progress }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-primary">Premium Sports AI SaaS</span>
            <span className="badge">Section: {currentItem.label}</span>
            <span className="badge">{language === "te" ? "Telugu Pipeline" : "English Pipeline"}</span>
          </div>
          <div>
            <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-[var(--text-main)] sm:text-4xl xl:text-5xl">
              Control the full sports content pipeline from research to render to revenue.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              A calmer, production-grade workspace for sports news intake, AI scripting, voice generation, video automation, and publishing performance.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {analytics.overviewCards.map((card) => (
              <MiniInsightCard key={card.label} card={card} />
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Live Pipeline</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status?.currentTask || "Waiting for next run"}</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{status?.selectedTopicSummary || "The system is ready to pick the next sports story automatically."}</p>
            </div>
            {status?.failed ? (
              <XCircle className="h-9 w-9 text-[var(--danger)]" />
            ) : status?.running ? (
              <LoaderCircle className="h-9 w-9 animate-spin text-[var(--warning)]" />
            ) : (
              <CheckCircle2 className="h-9 w-9 text-[var(--success)]" />
            )}
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Pipeline progress</span>
              <span className="text-[var(--text-main)]">{progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#3B82F6_0%,#22C55E_100%)]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatusMetric label="Current stage" value={status?.currentStage || "Ready"} />
              <StatusMetric label="Last run" value={status?.lastRunTimeLabel || "No recent run"} />
              <StatusMetric label="Uploads live" value={`${status?.youtubeLinks?.length || 0}`} />
              <StatusMetric label="Preview assets" value={`${status?.previewItems?.length || 0}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function StatsStrip({ metrics, analytics, news, status }) {
  const cards = [
    { label: "Total Videos", value: metrics.videoCount, meta: "Rendered previews and live assets", tone: "accent" },
    { label: "AI Scripts", value: metrics.newsCount + metrics.logCount, meta: "Generated story units", tone: "success" },
    { label: "Views", value: analytics.totalViews, meta: "Simulated current cycle reach", tone: "accent" },
    { label: "Revenue", value: analytics.revenueLabel, meta: "Estimated monthly monetization", tone: "success" },
    { label: "Trending News", value: news.length, meta: `${news.filter((item) => item.trending).length} breaking angles`, tone: "warning" },
    { label: "Upload Status", value: status?.statusLabel || "Idle", meta: status?.running ? "Actively processing" : "Ready for dispatch", tone: status?.failed ? "danger" : "success" },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="glass-card card-hover p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--text-main)]">{card.value}</p>
            </div>
            <div className={`status-dot status-dot-${card.tone}`} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <span className={`trend-pill trend-pill-${card.tone}`}>{trendLabel(card.label)}</span>
              <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">{card.meta}</p>
            </div>
            <div className="mini-sparkline">
              {[16, 24, 19, 31, 28, 36].map((value, sparkIndex) => (
                <span key={sparkIndex} style={{ height: `${value}px` }} />
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

function AnalyticsSection({ analytics, dateFilter, setDateFilter, analyticsView, setAnalyticsView, expanded = false }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        kicker="Analytics"
        title="Performance intelligence"
        description="Track output, momentum, views, and monetization across the current automation cycle."
        actions={
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={dateFilter} onChange={setDateFilter} options={[["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"]]} />
            <FilterSelect value={analyticsView} onChange={setAnalyticsView} options={[["monthly", "Monthly"], ["weekly", "Weekly"]]} />
            <button type="button" className="secondary-button">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      <div className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-[1.15fr_0.85fr]"}`}>
        <ChartCard title="Views vs script velocity" subtitle="Audience demand against AI content throughput">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="scripts" stroke="#22C55E" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue composition" subtitle="Split by inventory format">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={analytics.revenueMix} dataKey="value" nameKey="label" innerRadius={70} outerRadius={102} paddingAngle={4}>
                {analytics.revenueMix.map((entry, index) => (
                  <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {analytics.revenueMix.map((item, index) => (
              <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                  <p className="text-sm text-[var(--text-main)]">{item.label}</p>
                </div>
                <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">{item.value}%</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Automation momentum" subtitle="Upload growth and execution pace">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="uploads" stroke="#22C55E" fill="rgba(34,197,94,0.18)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Format output" subtitle="Short-form vs long-form mix">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="shorts" fill="#3B82F6" radius={[10, 10, 0, 0]} />
              <Bar dataKey="long" fill="#F59E0B" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function NewsAndVideoSection({ news, trendingVideos, expanded = false }) {
  return (
    <section className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-[1.05fr_0.95fr]"}`}>
      <div className="glass-card p-5">
        <SectionHeader
          kicker="Sports News"
          title="Live newsroom feed"
          description="Breaking stories, verified headlines, and fresh match narratives."
          actions={<button type="button" className="secondary-button">View all</button>}
        />
        <div className="mt-5 space-y-3">
          {news.slice(0, expanded ? 10 : 6).map((item) => (
            <motion.button key={item.id} whileHover={{ y: -2 }} type="button" className="news-card">
              {item.image ? <img src={item.image} alt={item.title} className="news-image" /> : <div className="news-image news-image-fallback"><Globe className="h-5 w-5" /></div>}
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-warning">{item.category}</span>
                  <span className="badge">{item.source}</span>
                  {item.trending ? <span className="badge badge-danger">Breaking</span> : null}
                </div>
                <h4 className="mt-3 line-clamp-2 text-base font-semibold text-[var(--text-main)]">{item.title}</h4>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{item.summary}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">{item.publishedAt || "Live now"}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
              </div>
            </motion.button>
          ))}
          {!news.length ? <div className="empty-state">No news available yet.</div> : null}
        </div>
      </div>

      <div className="glass-card p-5">
        <SectionHeader
          kicker="Trending Videos"
          title="High-performing formats"
          description="Top thumbnails and video angles getting attention right now."
          actions={<button type="button" className="secondary-button">Open library</button>}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {trendingVideos.map((item) => (
            <button key={item.id} type="button" className="video-card group">
              <div className="video-thumb">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-900">
                    <Video className="h-7 w-7 text-slate-400" />
                  </div>
                )}
                <div className="play-overlay">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <span className="duration-pill">{item.duration}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-main)]">{item.title}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{item.category}</span>
                  <span>{item.views} views</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudioSection({ dashboard, generatorForm, setGeneratorForm, runtime, actionState, generatedPrompt, askAiResult, expanded = false, videoFocus = false }) {
  const setField = (key, value) => setGeneratorForm((prev) => ({ ...prev, [key]: value }));

  return (
    <section className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-[1.08fr_0.92fr]"}`}>
      <div className="glass-card p-5">
        <SectionHeader
          kicker="AI Video Generator"
          title={videoFocus ? "Production-ready video generation" : "Premium content studio"}
          description="Build the next script, voice track, or video package without leaving the dashboard."
          actions={<button type="button" className="chip-button"><MoreHorizontal className="h-4 w-4" />More</button>}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Topic">
            <input className="input-shell" value={generatorForm.topic} onChange={(event) => setField("topic", event.target.value)} placeholder="Enter match, player, or sports story" />
          </Field>
          <Field label="Language">
            <select className="select-shell" value={generatorForm.language} onChange={(event) => setField("language", event.target.value)}>
              <option value="te">Telugu</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Voice">
            <select className="select-shell" value={generatorForm.voice} onChange={(event) => setField("voice", event.target.value)}>
              {voiceOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Duration">
            <select className="select-shell" value={generatorForm.duration} onChange={(event) => setField("duration", event.target.value)}>
              {durationOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Platform">
            <select className="select-shell" value={generatorForm.platform} onChange={(event) => setField("platform", event.target.value)}>
              {generatorPlatforms.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Prompt Style">
            <select className="select-shell" value={runtime.promptStyle || "breaking"} onChange={() => {}}>
              <option>{runtime.promptStyle || "breaking"}</option>
              <option>documentary</option>
              <option>hype</option>
              <option>analysis</option>
            </select>
          </Field>
        </div>

        <Field label="Prompt" className="mt-4">
          <textarea
            className="input-shell min-h-[160px] resize-none"
            value={generatorForm.prompt}
            onChange={(event) => {
              setField("prompt", event.target.value);
              dashboard.setPromptInput(event.target.value);
            }}
            placeholder="Create a cinematic sports script about..."
          />
        </Field>

        <button type="button" className="dropzone-button mt-4">
          <Upload className="h-5 w-5" />
          Drag and drop reference screenshots, thumbnails, or clips
        </button>

        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton
            icon={WandSparkles}
            busy={actionState.prompt}
            onClick={() => {
              dashboard.setPromptInput(generatorForm.topic);
              dashboard.askAi({ topic: generatorForm.topic || generatorForm.prompt, generate_video: true });
            }}
            label="Generate Script"
          />
          <ActionButton icon={Mic2} busy={actionState.short} onClick={dashboard.runShort} label="Generate Voice" secondary />
          <ActionButton icon={Video} busy={actionState.long} onClick={dashboard.runLong} label="Generate Video" secondary />
          <ActionButton icon={Download} busy={false} onClick={dashboard.generateAutoPrompt} label="Export" secondary />
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-main)]">Generation progress</p>
            <span className="badge badge-primary">Live</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MiniStatus label="Script" value={askAiResult?.title ? "Ready" : "Waiting"} tone={askAiResult?.title ? "success" : "warning"} />
            <MiniStatus label="Voice" value={actionState.short ? "Rendering" : "Standby"} tone={actionState.short ? "warning" : "accent"} />
            <MiniStatus label="Video" value={actionState.long ? "Building" : "Standby"} tone={actionState.long ? "warning" : "accent"} />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <PreviewPanel title="Generated brief" icon={BrainCircuit}>
          <p className="text-sm font-semibold text-[var(--text-main)]">{askAiResult?.title || "No brief generated yet"}</p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{askAiResult?.hook || generatedPrompt || "Use the generator to produce a hook, structured script, scene plan, and thumbnail strategy."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(askAiResult?.title_options || []).slice(0, 3).map((item, index) => (
              <span key={`${item}-${index}`} className="badge">{item}</span>
            ))}
          </div>
        </PreviewPanel>

        <PreviewPanel title="Thumbnail strategy" icon={Sparkles}>
          {askAiResult?.thumbnail_strategy ? (
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p><span className="text-[var(--text-main)]">Text:</span> {askAiResult.thumbnail_strategy.text}</p>
              <p><span className="text-[var(--text-main)]">Layout:</span> {askAiResult.thumbnail_strategy.layout}</p>
              <p><span className="text-[var(--text-main)]">Focal subject:</span> {askAiResult.thumbnail_strategy.focal_subject}</p>
            </div>
          ) : (
            <p className="text-sm leading-7 text-[var(--text-secondary)]">Thumbnail composition, focal subject, and CTR guidance will appear here.</p>
          )}
        </PreviewPanel>

        <PreviewPanel title="Scene breakdown" icon={Grip}>
          <div className="space-y-2">
            {(askAiResult?.scene_breakdown || []).slice(0, 4).map((scene, index) => (
              <div key={`scene-${index}`} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-medium text-[var(--text-main)]">Scene {scene.scene_number || index + 1}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{scene.narration}</p>
              </div>
            ))}
            {!askAiResult?.scene_breakdown?.length ? <p className="text-sm text-[var(--text-secondary)]">Scene-by-scene visuals and motion direction will appear here.</p> : null}
          </div>
        </PreviewPanel>
      </div>
    </section>
  );
}

function UploadsSection({ uploadTable, tableQuery, setTableQuery, expanded = false }) {
  return (
    <section className="glass-card p-5">
      <SectionHeader
        kicker="Uploads"
        title="Queue and publishing status"
        description="Track queued, processing, failed, and published assets in one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="search-inline">
              <Search className="h-4 w-4" />
              <input
                value={tableQuery}
                onChange={(event) => setTableQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="Search uploads"
              />
            </div>
            <button type="button" className="secondary-button">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        }
      />

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--border)]">
        <div className="table-scroll">
          <table className="min-w-full">
            <thead className="table-head">
              {uploadTable.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="table-head-cell">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {uploadTable.getRowModel().rows.map((row) => (
                <tr key={row.id} className="table-row">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!uploadTable.getRowModel().rows.length ? <div className="empty-state rounded-none border-0">No upload rows match your filters.</div> : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing {uploadTable.getRowModel().rows.length} queue items
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="table-action-button" onClick={() => uploadTable.previousPage()} disabled={!uploadTable.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button type="button" className="table-action-button" onClick={() => uploadTable.nextPage()} disabled={!uploadTable.getCanNextPage()}>
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["Queued", "Processing", "Completed"].map((label) => (
            <div key={label} className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
                {uploadTable.getCoreRowModel().rows.filter((row) => String(row.original.status).toLowerCase().includes(label.toLowerCase().slice(0, 4))).length}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ActivitySection({ rows }) {
  return (
    <section className="glass-card p-5">
      <SectionHeader
        kicker="Activity Feed"
        title="Recent system motion"
        description="Realtime actions, stage changes, and pipeline trace moments."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.slice(0, 9).map((item) => (
          <div key={item.id} className="feed-item">
            <div className={`status-dot status-dot-${item.tone || "accent"}`} />
            <div className="min-w-0">
              <p className="text-sm text-[var(--text-main)]">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamsSection({ teamCards, news }) {
  return (
    <section className="space-y-4">
      <SectionHeader
        kicker="Teams & Players"
        title="Story heatmap from current headlines"
        description="Surface the names and clusters drawing the most editorial attention."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teamCards.map((item) => (
          <div key={item.name} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-[var(--text-main)]">{item.name}</h4>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.note}</p>
              </div>
              <span className="badge badge-primary">{item.count} mentions</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#3B82F6_0%,#22C55E_100%)]" style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <h4 className="text-lg font-semibold text-[var(--text-main)]">Coverage details</h4>
        <div className="mt-4 grid gap-3">
          {news.slice(0, 8).map((item) => (
            <button key={item.id} type="button" className="news-inline-row">
              <span className="badge">{item.category}</span>
              <span className="flex-1 truncate text-left text-sm text-[var(--text-main)]">{item.title}</span>
              <ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutomationSection({ dashboard, status, logs, runtime, settingsForm, setSettingsForm, actionState, settingsOnly = false }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      {!settingsOnly ? (
        <div className="glass-card p-5">
          <SectionHeader kicker="Automation" title="Queue and execution layer" description="Launch full runs, shorts, and long-form pipelines from one place." />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <QueueMetric title="Now running" value={status?.queue?.current_job?.mode || "None"} tone="warning" />
            <QueueMetric title="Queued jobs" value={`${status?.queue?.queue_length || 0}`} tone="accent" />
            <QueueMetric title="Failure state" value={status?.failed ? "Detected" : "Clear"} tone={status?.failed ? "danger" : "success"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton icon={Rocket} busy={actionState.auto} onClick={dashboard.runNow} label="Start automation" />
            <ActionButton icon={Video} busy={actionState.short} onClick={dashboard.runShort} label="Shorts run" secondary />
            <ActionButton icon={Video} busy={actionState.long} onClick={dashboard.runLong} label="Long-form run" secondary />
          </div>
          <div className="mt-5 space-y-3">
            {[...(status?.queue?.queued_jobs || []).slice(0, 4), ...(status?.queue?.current_job ? [status.queue.current_job] : [])].map((job) => (
              <div key={job.id} className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-main)]">{job.mode} pipeline</p>
                  <StatusPill status={job.status || "Queued"} />
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{job.prompt || "Auto topic selection"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass-card p-5">
        <SectionHeader kicker="Settings" title="Runtime controls" description="Tune language, upload, duration, source priorities, and notification behavior." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Bot token">
            <input className="input-shell" value={settingsForm.telegramBotToken || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramBotToken: event.target.value }))} />
          </Field>
          <Field label="Chat ID">
            <input className="input-shell" value={settingsForm.telegramChatId || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramChatId: event.target.value }))} />
          </Field>
          <Field label="Short duration">
            <input className="input-shell" type="number" value={settingsForm.shortVideoDuration || 45} onChange={(event) => setSettingsForm((prev) => ({ ...prev, shortVideoDuration: Number(event.target.value) }))} />
          </Field>
          <Field label="Long duration">
            <input className="input-shell" type="number" value={settingsForm.longVideoDuration || 180} onChange={(event) => setSettingsForm((prev) => ({ ...prev, longVideoDuration: Number(event.target.value) }))} />
          </Field>
        </div>

        <Field label="Preferred sources" className="mt-4">
          <input
            className="input-shell"
            value={(settingsForm.preferredNewsSources || []).join(", ")}
            onChange={(event) =>
              setSettingsForm((prev) => ({
                ...prev,
                preferredNewsSources: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
              }))
            }
          />
        </Field>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToggleButton label="Notifications" checked={settingsForm.enableNotifications} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableNotifications: checked }))} />
          <ToggleButton label="Uploads" checked={settingsForm.enableUpload} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableUpload: checked }))} />
          <ToggleButton label="Shorts" checked={settingsForm.enableShorts} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableShorts: checked }))} />
          <ToggleButton label="Long videos" checked={settingsForm.enableLongVideo} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, enableLongVideo: checked }))} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="primary-button"
            disabled={actionState.saveSettings}
            onClick={() =>
              dashboard.saveRuntimeSettings({
                default_language: dashboard.language,
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
          >
            {actionState.saveSettings ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            Save runtime
          </button>

          <button type="button" className="secondary-button" disabled={actionState.telegram} onClick={dashboard.sendTelegramTest}>
            {actionState.telegram ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            Send Telegram test
          </button>
        </div>

        {!settingsOnly ? (
          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[#0c1628] p-4">
            <p className="text-sm font-medium text-[var(--text-main)]">Recent system trace</p>
            <div className="mt-3 space-y-2">
              {logs.slice(-4).reverse().map((log) => (
                <div key={log.id} className="rounded-[18px] border border-[var(--border)] bg-white/[0.04] p-3 text-sm text-[var(--text-secondary)]">
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MonetizationSection({ analytics, trendingVideos }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-card p-5">
        <SectionHeader kicker="Monetization" title="Revenue and audience quality" description="See what formats are worth scaling next." />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MiniStat label="Estimated revenue" value={analytics.revenueLabel} />
          <MiniStat label="RPM" value={`$${analytics.rpm}`} />
          <MiniStat label="Avg watch" value={`${analytics.watchMinutes}m`} />
        </div>
        <div className="mt-5">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="rgba(59,130,246,0.22)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <SectionHeader kicker="Best Inventory" title="Formats worth doubling down on" description="The current top performers by category and projected monetization value." />
        <div className="mt-4 space-y-3">
          {trendingVideos.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--text-main)]">{item.title}</p>
                <CircleDollarSign className="h-4 w-4 text-[var(--success)]" />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
                <span>{item.category}</span>
                <span>{item.views} views</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UploadModal({ upload, onClose }) {
  return (
    <>
      <motion.button
        type="button"
        className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="modal-shell"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Upload Inspector</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{upload.title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close upload inspector">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MiniStat label="Type" value={upload.type} />
          <MiniStat label="Status" value={upload.status} />
          <MiniStat label="Progress" value={`${upload.progress}%`} />
          <MiniStat label="Updated" value={upload.updatedAt} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="primary-button" onClick={onClose}>
            Continue
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}

function SectionHeader({ kicker, title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="section-kicker">{kicker}</p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{title}</h3>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-[var(--text-main)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        <button type="button" className="chip-button">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select className="select-shell" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function ActionButton({ icon: Icon, busy, onClick, label, secondary = false }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className={secondary ? "secondary-button" : "primary-button"}>
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function ToggleButton({ label, checked, onChange }) {
  return (
    <button type="button" className={`toggle-card ${checked ? "toggle-card-on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="text-sm font-medium text-[var(--text-main)]">{label}</span>
      <span className={`toggle-switch ${checked ? "toggle-switch-on" : ""}`}>
        <span className={`toggle-knob ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function StatusMetric({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function MiniInsightCard({ card }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-main)]">{card.value}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{card.meta}</p>
    </div>
  );
}

function PreviewPanel({ title, icon: Icon, children }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <h4 className="text-base font-semibold text-[var(--text-main)]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function MiniStatus({ label, value, tone }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <div className={`status-dot status-dot-${tone}`} />
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function QueueMetric({ title, value, tone }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <div className={`status-dot status-dot-${tone}`} />
      </div>
      <p className="mt-3 text-xl font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status).toLowerCase();
  const tone = normalized.includes("fail") ? "danger" : normalized.includes("complete") ? "success" : normalized.includes("queue") ? "warning" : "accent";
  return <span className={`badge badge-${tone}`}>{status}</span>;
}

function ToastStack({ items, onDismiss }) {
  return (
    <div className="fixed right-4 top-24 z-[80] space-y-3">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onDismiss(item.id)} className={`toast-card toast-card-${item.tone || "info"}`}>
          {item.message}
        </button>
      ))}
    </div>
  );
}

function buildUploadRows(status) {
  const links = status?.youtubeLinks || [];
  const previews = status?.previewItems || [];
  const queue = status?.queue || {};
  const queuedJobs = Array.isArray(queue.queued_jobs) ? queue.queued_jobs : [];
  const currentJob = queue.current_job ? [queue.current_job] : [];

  const generatedRows = [
    ...previews.map((item, index) => ({
      id: `preview-${index}`,
      title: item.label,
      type: item.variant === "long" ? "Long Video" : "Short Video",
      status: "Completed",
      progress: 100,
      updatedAt: "Ready",
    })),
    ...links.map((item, index) => ({
      id: `link-${index}`,
      title: item.label,
      type: "Published",
      status: "Completed",
      progress: 100,
      updatedAt: "Live",
    })),
    ...currentJob.map((job) => ({
      id: job.id,
      title: `${job.mode} pipeline`,
      type: "Processing",
      status: "Processing",
      progress: 62,
      updatedAt: job.current_stage || "Running",
    })),
    ...queuedJobs.map((job) => ({
      id: job.id,
      title: `${job.mode} queue item`,
      type: "Queued",
      status: "Queued",
      progress: 14,
      updatedAt: `#${job.position || 1}`,
    })),
  ];

  if (status?.failed) {
    generatedRows.push({
      id: "failed-last",
      title: "Last automation run",
      type: "Recovery",
      status: "Failed",
      progress: 100,
      updatedAt: "Needs retry",
    });
  }

  return generatedRows.length
    ? generatedRows
    : [{ id: "empty-1", title: "Shorts preview pipeline", type: "Queued", status: "Queued", progress: 12, updatedAt: "Awaiting run" }];
}

function buildActivityRows(status, logs) {
  const notes = (status?.notifications || []).slice().reverse();
  const fromNotes = notes.map((item, index) => ({
    id: `note-${index}`,
    title: item.message,
    meta: item.timestamp || "Realtime event",
    tone: String(item.message).toLowerCase().includes("fail") ? "danger" : "success",
  }));
  const fromLogs = logs.slice(-6).reverse().map((item) => ({
    id: item.id,
    title: item.message,
    meta: item.timestampLabel,
    tone: item.level === "error" ? "danger" : item.level === "success" ? "success" : "warning",
  }));
  return [...fromNotes, ...fromLogs];
}

function buildAnalyticsData(news, status, metrics, logs) {
  const base = [1, 2, 3, 4, 5, 6].map((index) => ({
    label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index - 1],
    views: 18000 + index * 4200 + metrics.videoCount * 900,
    scripts: 8 + index + metrics.newsCount,
    uploads: 3 + index + (status?.youtubeLinks?.length || 0),
    shorts: 2 + index,
    long: 1 + Math.floor(index / 2),
    revenue: 420 + index * 90 + metrics.uploadCount * 40,
  }));

  return {
    series: base,
    totalViews: `${Math.round(base.reduce((sum, item) => sum + item.views, 0) / 1000)}K`,
    revenueLabel: `$${base.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}`,
    rpm: (6.5 + metrics.uploadCount * 0.4).toFixed(2),
    watchMinutes: 5 + metrics.videoCount,
    revenueMix: [
      { label: "Shorts", value: 48 },
      { label: "Long-form", value: 34 },
      { label: "Affiliate", value: 12 },
      { label: "Sponsors", value: 6 },
    ],
    overviewCards: [
      { label: "News flow", value: `${news.length} live`, meta: "Source health and story readiness" },
      { label: "Upload readiness", value: `${status?.queue?.queue_length || 0} queued`, meta: "Pending publishes across formats" },
      { label: "System events", value: `${logs.length}`, meta: "Recent activity scanned and normalized" },
      { label: "Revenue pace", value: `$${(1200 + metrics.uploadCount * 135).toLocaleString()}`, meta: "Estimated monthly projection" },
    ],
  };
}

function buildTrendingVideos(status, news) {
  const preview = status?.previewItems || [];
  const linkItems = status?.youtubeLinks || [];
  const source = preview.length ? preview : linkItems.length ? linkItems : news.slice(0, 4);
  return source.slice(0, 4).map((item, index) => ({
    id: item.url || item.id || `video-${index}`,
    title: item.label || item.title || "AI Sports Breakdown",
    category: item.variant === "long" ? "Long-form" : item.category || "Sports",
    duration: item.variant === "long" ? "08:24" : "00:58",
    views: `${(42 + index * 18).toFixed(0)}K`,
    image: item.image || news[index]?.image || "",
  }));
}

function buildTeams(news) {
  const map = new Map();
  news.forEach((item) => {
    const raw = `${item.title} ${item.category}`.split(" ").slice(0, 2).join(" ");
    const name = raw || "Sports Desk";
    map.set(name, (map.get(name) || 0) + 1);
  });
  return Array.from(map.entries()).slice(0, 6).map(([name, count], index) => ({
    name,
    count,
    score: Math.min(100, 30 + count * 18 + index * 6),
    note: "Derived from current sports coverage concentration.",
  }));
}

function getProgress(status) {
  if (status?.failed || status?.status === "completed") return 100;
  const stage = String(status?.currentStage || "").toLowerCase();
  if (stage.includes("started")) return 10;
  if (stage.includes("news")) return 25;
  if (stage.includes("script")) return 48;
  if (stage.includes("voice")) return 66;
  if (stage.includes("video")) return 84;
  if (stage.includes("upload")) return 96;
  return status?.running ? 8 : 0;
}

function trendLabel(label) {
  if (label === "Revenue") return "+6.9%";
  if (label === "Views") return "+21.8%";
  if (label === "Trending News") return "Breaking";
  if (label === "Upload Status") return "Active";
  return "+12.4%";
}

function progressMessage(status) {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("fail")) return "Needs action";
  if (normalized.includes("complete")) return "Finished";
  if (normalized.includes("queue")) return "Queued";
  return "Running";
}

const tooltipStyle = {
  backgroundColor: "#111827",
  border: "1px solid #334155",
  borderRadius: "16px",
  color: "#E2E8F0",
};
