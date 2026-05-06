import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Globe,
  Grip,
  LoaderCircle,
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
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";

const chartColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444"];
const columnHelper = createColumnHelper();

export default function DashboardPage({ dashboard, currentPath, currentItem }) {
  const { status, news, logs, runtime, language, actionState, metrics, promptInput, generatedPrompt, askAiResult, toasts } = dashboard;
  const [settingsForm, setSettingsForm] = useState(runtime);
  const [dateFilter, setDateFilter] = useState("30d");
  const [tableQuery, setTableQuery] = useState("");
  const [analyticsView, setAnalyticsView] = useState("monthly");

  useEffect(() => {
    setSettingsForm(runtime);
  }, [runtime]);

  const progress = getProgress(status);
  const uploadRows = useMemo(() => buildUploadRows(status), [status]);
  const activityRows = useMemo(() => buildActivityRows(status, logs), [status, logs]);
  const analytics = useMemo(() => buildAnalyticsData(news, status, metrics, logs), [news, status, metrics, logs]);
  const trendingVideos = useMemo(() => buildTrendingVideos(status, news), [status, news]);
  const teamCards = useMemo(() => buildTeams(news), [news]);
  const generatorPlatforms = ["YouTube Shorts", "YouTube Long", "Instagram Reels", "X Highlights"];

  const uploadColumns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Asset",
        cell: (info) => <div className="min-w-[180px] font-medium text-[var(--text-main)]">{info.getValue()}</div>,
      }),
      columnHelper.accessor("type", { header: "Type" }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      columnHelper.accessor("progress", {
        header: "Progress",
        cell: (info) => (
          <div className="min-w-[160px]">
            <div className="mb-2 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>{info.getValue()}%</span>
              <span>{info.row.original.updatedAt}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${info.getValue()}%` }} />
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <div className="flex gap-2">
            <button type="button" className="table-action-button">Retry</button>
            <button type="button" className="table-action-button">{info.row.original.status === "Completed" ? "Open" : "Cancel"}</button>
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

  const sections = {
    "/dashboard": (
      <>
        <HeroSection currentItem={currentItem} language={language} status={status} analytics={analytics} />
        <StatsSection metrics={metrics} analytics={analytics} news={news} status={status} />
        <AnalyticsSection analytics={analytics} dateFilter={dateFilter} setDateFilter={setDateFilter} analyticsView={analyticsView} setAnalyticsView={setAnalyticsView} />
        <ContentGrid news={news} trendingVideos={trendingVideos} />
        <GeneratorSection
          dashboard={dashboard}
          runtime={runtime}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          actionState={actionState}
          promptInput={promptInput}
          generatedPrompt={generatedPrompt}
          askAiResult={askAiResult}
          generatorPlatforms={generatorPlatforms}
          status={status}
        />
        <UploadsSection uploadTable={uploadTable} uploadRows={uploadRows} tableQuery={tableQuery} setTableQuery={setTableQuery} />
        <ActivitySection rows={activityRows} />
      </>
    ),
    "/sports-news": <ContentGrid news={news} trendingVideos={trendingVideos} expanded />,
    "/ai-content": (
      <GeneratorSection
        dashboard={dashboard}
        runtime={runtime}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        actionState={actionState}
        promptInput={promptInput}
        generatedPrompt={generatedPrompt}
        askAiResult={askAiResult}
        generatorPlatforms={generatorPlatforms}
        status={status}
      />
    ),
    "/video-generator": (
      <GeneratorSection
        dashboard={dashboard}
        runtime={runtime}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        actionState={actionState}
        promptInput={promptInput}
        generatedPrompt={generatedPrompt}
        askAiResult={askAiResult}
        generatorPlatforms={generatorPlatforms}
        status={status}
        focusVideo
      />
    ),
    "/uploads": <UploadsSection uploadTable={uploadTable} uploadRows={uploadRows} tableQuery={tableQuery} setTableQuery={setTableQuery} expanded />,
    "/analytics": <AnalyticsSection analytics={analytics} dateFilter={dateFilter} setDateFilter={setDateFilter} analyticsView={analyticsView} setAnalyticsView={setAnalyticsView} expanded />,
    "/teams-players": <TeamsSection teamCards={teamCards} news={news} />,
    "/automation": <AutomationSection dashboard={dashboard} status={status} logs={logs} runtime={runtime} settingsForm={settingsForm} setSettingsForm={setSettingsForm} actionState={actionState} />,
    "/monetization": <MonetizationSection analytics={analytics} trendingVideos={trendingVideos} />,
    "/settings": <AutomationSection dashboard={dashboard} status={status} logs={logs} runtime={runtime} settingsForm={settingsForm} setSettingsForm={setSettingsForm} actionState={actionState} settingsOnly />,
  };

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} onDismiss={dashboard.dismissToast} />
      {sections[currentPath] || sections["/dashboard"]}
    </div>
  );
}

function HeroSection({ currentItem, language, status, analytics }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-primary">Premium AI Sports Ops</span>
            <span className="badge">Section: {currentItem.label}</span>
            <span className="badge">{language === "te" ? "Telugu Pipeline" : "English Pipeline"}</span>
          </div>
          <div>
            <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-[var(--text-main)] sm:text-4xl xl:text-5xl">
              Modern automation control for sports news, AI scripts, rendering, and monetized publishing.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              The entire production flow now lives in a calmer, more premium workspace with faster scanning, better hierarchy, and clearer actions.
            </p>
          </div>
          <div className="dashboard-grid">
            {analytics.overviewCards.map((card) => (
              <MetricCard key={card.label} card={card} />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Live status</p>
              <h3 className="text-2xl font-semibold text-[var(--text-main)]">{status?.currentTask || "Waiting for next run"}</h3>
            </div>
            {status?.failed ? <XCircle className="h-8 w-8 text-[var(--danger)]" /> : status?.running ? <LoaderCircle className="h-8 w-8 animate-spin text-[var(--warning)]" /> : <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />}
          </div>
          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Pipeline progress</span>
              <span>{progressLabel(status)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#3B82F6_0%,#22C55E_100%)]" style={{ width: `${getProgress(status)}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniPanel label="Current stage" value={status?.currentStage || "Queued"} />
              <MiniPanel label="Selected topic" value={status?.selectedTopic || "Auto selected"} />
              <MiniPanel label="Uploads live" value={`${status?.youtubeLinks?.length || 0}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function StatsSection({ metrics, analytics, news, status }) {
  const cards = [
    { label: "Total Videos", value: metrics.videoCount, change: "+12.4%", tone: "accent" },
    { label: "AI Scripts", value: metrics.newsCount + metrics.logCount, change: "+8.1%", tone: "success" },
    { label: "Views", value: analytics.totalViews, change: "+21.8%", tone: "accent" },
    { label: "Revenue", value: analytics.revenueLabel, change: "+6.9%", tone: "success" },
    { label: "Trending News", value: news.length, change: `${news.filter((item) => item.trending).length} breaking`, tone: "warning" },
    { label: "Upload Status", value: status?.statusLabel || "Idle", change: status?.running ? "In progress" : "Ready", tone: status?.failed ? "danger" : "success" },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card card-hover p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--text-main)]">{card.value}</p>
            </div>
            <div className={`status-dot status-dot-${card.tone}`} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className={`trend-pill trend-pill-${card.tone}`}>{card.change}</span>
            <div className="mini-sparkline">
              {[18, 24, 21, 29, 25, 34].map((value, sparkIndex) => (
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-kicker">Analytics</p>
          <h3 className="text-2xl font-semibold text-[var(--text-main)]">Performance intelligence</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="select-shell" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <select className="select-shell" value={analyticsView} onChange={(event) => setAnalyticsView(event.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
          <button type="button" className="secondary-button">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      <div className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-[1.25fr_0.75fr]"}`}>
        <ChartCard title="Views vs script velocity">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="scripts" stroke="#22C55E" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue composition">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={analytics.revenueMix} dataKey="value" nameKey="label" innerRadius={72} outerRadius={104} paddingAngle={4}>
                {analytics.revenueMix.map((entry, index) => (
                  <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Automation momentum">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="uploads" stroke="#22C55E" fill="rgba(34,197,94,0.2)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Platform output by format">
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

function ContentGrid({ news, trendingVideos, expanded = false }) {
  return (
    <section className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : "xl:grid-cols-[1.1fr_0.9fr]"}`}>
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="section-kicker">Sports News</p>
            <h3 className="text-xl font-semibold text-[var(--text-main)]">Live newsroom feed</h3>
          </div>
          <button type="button" className="secondary-button">View all</button>
        </div>
        <div className="space-y-3">
          {news.slice(0, expanded ? 10 : 5).map((item) => (
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
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{item.publishedAt || "Live now"}</p>
              </div>
            </motion.button>
          ))}
          {!news.length ? <div className="empty-state">No news available yet.</div> : null}
        </div>
      </div>
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="section-kicker">Trending Videos</p>
            <h3 className="text-xl font-semibold text-[var(--text-main)]">Top-performing formats</h3>
          </div>
          <button type="button" className="secondary-button">Open library</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {trendingVideos.map((item) => (
            <button key={item.id} type="button" className="video-card group">
              <div className="video-thumb">
                {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-slate-900"><Video className="h-7 w-7 text-slate-400" /></div>}
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

function GeneratorSection({ dashboard, runtime, settingsForm, setSettingsForm, actionState, promptInput, generatedPrompt, askAiResult, generatorPlatforms, status, focusVideo = false }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="section-kicker">AI Video Generator</p>
            <h3 className="text-xl font-semibold text-[var(--text-main)]">Create scripts, voice, and video from one panel</h3>
          </div>
          <button type="button" className="secondary-button">
            <Grip className="h-4 w-4" />
            Templates
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Topic">
            <input className="input-shell" value={promptInput} onChange={(event) => dashboard.setPromptInput(event.target.value)} placeholder="IPL title race, transfer update, match breakdown..." />
          </FormField>
          <FormField label="Language">
            <select className="select-shell" value={dashboard.language} onChange={(event) => dashboard.setLanguage(event.target.value)}>
              {runtime.languageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </FormField>
          <FormField label="Voice">
            <select className="select-shell" value={settingsForm.ttsProvider} onChange={(event) => setSettingsForm((prev) => ({ ...prev, ttsProvider: event.target.value }))}>
              {runtime.ttsOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </FormField>
          <FormField label="Duration">
            <select className="select-shell" value={settingsForm.defaultMode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultMode: event.target.value }))}>
              {runtime.modeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </FormField>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Platform selector">
            <div className="flex flex-wrap gap-2">
              {generatorPlatforms.map((platform) => <button key={platform} type="button" className="chip-button">{platform}</button>)}
            </div>
          </FormField>
          <FormField label="Drop media">
            <button type="button" className="dropzone-button">
              <Upload className="h-5 w-5" />
              Drag and drop media references
            </button>
          </FormField>
        </div>
        <FormField label="Prompt">
          <textarea className="input-shell min-h-[180px]" value={settingsForm.promptSeed || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, promptSeed: event.target.value }))} placeholder="Add channel tone, CTA, hooks, guardrails, sponsor notes..." />
        </FormField>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton icon={WandSparkles} busy={actionState.prompt} onClick={dashboard.generateAutoPrompt} label="Generate Script" />
          <ActionButton icon={BrainCircuit} busy={actionState.prompt} onClick={() => dashboard.askAi({ topic: promptInput || status?.selectedTopic || "Latest sports update", mode: runtime.defaultMode })} label="Generate Voice" secondary />
          <ActionButton icon={Video} busy={actionState.long || actionState.short || actionState.auto} onClick={focusVideo ? dashboard.runLong : dashboard.runNow} label="Generate Video" />
          <button type="button" className="secondary-button"><Download className="h-4 w-4" />Export</button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-kicker">Generation progress</p>
              <h3 className="text-xl font-semibold text-[var(--text-main)]">Realtime output states</h3>
            </div>
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="mt-5 space-y-4">
            {[
              ["Prompt", generatedPrompt ? 100 : 64],
              ["Voice", status?.running ? 72 : 100],
              ["Video", status?.running ? 48 : status?.youtubeLinks?.length ? 100 : 30],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm text-[var(--text-secondary)]">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <p className="section-kicker">Generated output</p>
          <h3 className="text-xl font-semibold text-[var(--text-main)]">Prompt and script preview</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-4 text-sm leading-7 text-[var(--text-secondary)]">
              {generatedPrompt || "Generate a prompt to preview the next AI briefing."}
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-4 text-sm leading-7 text-[var(--text-secondary)]">
              {askAiResult?.script ? String(askAiResult.script).slice(0, 500) : "AI script preview will appear here after generation."}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadsSection({ uploadTable, uploadRows, tableQuery, setTableQuery, expanded = false }) {
  return (
    <section className="glass-card p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-kicker">Uploads</p>
          <h3 className="text-xl font-semibold text-[var(--text-main)]">Queue, progress, and recent delivery</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="search-inline">
            <Search className="h-4 w-4 text-slate-400" />
            <input className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none" value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Search uploads" />
          </div>
          <button type="button" className="secondary-button"><RefreshCcw className="h-4 w-4" />Refresh queue</button>
        </div>
      </div>
      <div className={`grid gap-4 ${expanded ? "xl:grid-cols-1" : "xl:grid-cols-[0.65fr_1.35fr]"}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {uploadRows.slice(0, 4).map((row) => (
            <div key={row.id} className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--text-main)]">{row.title}</p>
                <StatusPill status={row.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{row.type}</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${row.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0c1628]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-[#0c1628]">
                {uploadTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="whitespace-nowrap px-4 py-4 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {uploadTable.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {!uploadTable.getRowModel().rows.length ? (
                  <tr>
                    <td colSpan={uploadColumnsFallback} className="px-4 py-10">
                      <div className="empty-state">No upload rows yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-4 text-sm text-[var(--text-secondary)]">
            <span>
              Page {uploadTable.getState().pagination.pageIndex + 1} of {uploadTable.getPageCount() || 1}
            </span>
            <div className="flex gap-2">
              <button type="button" className="secondary-button h-10 px-3" onClick={() => uploadTable.previousPage()} disabled={!uploadTable.getCanPreviousPage()}>Prev</button>
              <button type="button" className="secondary-button h-10 px-3" onClick={() => uploadTable.nextPage()} disabled={!uploadTable.getCanNextPage()}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActivitySection({ rows }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="glass-card p-5">
        <p className="section-kicker">Recent uploads</p>
        <h3 className="text-xl font-semibold text-[var(--text-main)]">Activity feed</h3>
        <div className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row) => (
            <div key={row.id} className="feed-item">
              <div className={`status-dot status-dot-${row.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-main)]">{row.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{row.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-5">
        <p className="section-kicker">System log</p>
        <h3 className="text-xl font-semibold text-[var(--text-main)]">Operational timeline</h3>
        <div className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row) => (
            <div key={`${row.id}-log`} className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--text-main)]">{row.title}</p>
                <StatusPill status={row.tone === "danger" ? "Failed" : row.tone === "success" ? "Completed" : "Processing"} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{row.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamsSection({ teamCards, news }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="section-kicker">Teams & Players</p>
        <h3 className="text-2xl font-semibold text-[var(--text-main)]">Story heatmap from current headlines</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teamCards.map((item) => (
          <div key={item.name} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[var(--text-main)]">{item.name}</h4>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.note}</p>
              </div>
              <span className="badge badge-primary">{item.count} mentions</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${item.score}%` }} />
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
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutomationSection({ dashboard, status, logs, runtime, settingsForm, setSettingsForm, actionState, settingsOnly = false }) {
  const queue = status?.queue || {};
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      {!settingsOnly ? (
        <div className="glass-card p-5">
          <p className="section-kicker">Automation</p>
          <h3 className="text-xl font-semibold text-[var(--text-main)]">Queue and live execution</h3>
          <div className="mt-5 grid gap-3">
            <QueueRow title="Now running" value={queue.current_job?.mode || "None"} tone="warning" />
            <QueueRow title="Queued jobs" value={`${queue.queue_length || 0}`} tone="accent" />
            <QueueRow title="Failure state" value={status?.failed ? "Detected" : "Clear"} tone={status?.failed ? "danger" : "success"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton icon={Rocket} busy={actionState.auto} onClick={dashboard.runNow} label="Start auto run" />
            <ActionButton icon={Video} busy={actionState.short} onClick={dashboard.runShort} label="Shorts run" secondary />
            <ActionButton icon={Video} busy={actionState.long} onClick={dashboard.runLong} label="Long run" secondary />
          </div>
          <div className="mt-5 space-y-3">
            {(queue.queued_jobs || []).slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
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
        <p className="section-kicker">Settings</p>
        <h3 className="text-xl font-semibold text-[var(--text-main)]">Runtime controls</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField label="Bot token">
            <input className="input-shell" value={settingsForm.telegramBotToken || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramBotToken: event.target.value }))} />
          </FormField>
          <FormField label="Chat ID">
            <input className="input-shell" value={settingsForm.telegramChatId || ""} onChange={(event) => setSettingsForm((prev) => ({ ...prev, telegramChatId: event.target.value }))} />
          </FormField>
          <FormField label="Short duration">
            <input className="input-shell" type="number" value={settingsForm.shortVideoDuration || 45} onChange={(event) => setSettingsForm((prev) => ({ ...prev, shortVideoDuration: Number(event.target.value) }))} />
          </FormField>
          <FormField label="Long duration">
            <input className="input-shell" type="number" value={settingsForm.longVideoDuration || 180} onChange={(event) => setSettingsForm((prev) => ({ ...prev, longVideoDuration: Number(event.target.value) }))} />
          </FormField>
        </div>
        <FormField label="Preferred sources">
          <input className="input-shell" value={(settingsForm.preferredNewsSources || []).join(", ")} onChange={(event) => setSettingsForm((prev) => ({ ...prev, preferredNewsSources: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
        </FormField>
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
            Send Telegram Test
          </button>
        </div>
        {!settingsOnly ? (
          <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[#0c1628] p-4">
            <p className="text-sm font-medium text-[var(--text-main)]">Recent system trace</p>
            <div className="mt-3 space-y-2">
              {logs.slice(-4).reverse().map((log) => (
                <div key={log.id} className="rounded-2xl border border-[var(--border)] bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
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
        <p className="section-kicker">Monetization</p>
        <h3 className="text-xl font-semibold text-[var(--text-main)]">Revenue and audience quality</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricStat label="Estimated revenue" value={analytics.revenueLabel} />
          <MetricStat label="RPM" value={`$${analytics.rpm}`} />
          <MetricStat label="Average watch" value={`${analytics.watchMinutes}m`} />
        </div>
        <div className="mt-5">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.series}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="rgba(59,130,246,0.25)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card p-5">
        <p className="section-kicker">Best inventory</p>
        <h3 className="text-xl font-semibold text-[var(--text-main)]">Formats worth doubling down on</h3>
        <div className="mt-4 space-y-3">
          {trendingVideos.map((item) => (
            <div key={item.id} className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
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

function ChartCard({ title, children }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold text-[var(--text-main)]">{title}</h4>
        <button type="button" className="secondary-button h-9 px-3 text-xs">Filter</button>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ card }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
      <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-main)]">{card.value}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{card.meta}</p>
    </div>
  );
}

function MiniPanel({ label, value }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-sm text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
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

function QueueRow({ title, value, tone }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <div className={`status-dot status-dot-${tone}`} />
      </div>
      <p className="mt-3 text-xl font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function MetricStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/5 p-4">
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
    <div className="fixed right-4 top-20 z-[80] space-y-3">
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
    : [
        { id: "empty-1", title: "Shorts preview pipeline", type: "Queued", status: "Queued", progress: 12, updatedAt: "Awaiting run" },
      ];
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

function progressLabel(status) {
  if (status?.failed) return "Recovery needed";
  if (status?.running) return "In progress";
  if (status?.status === "completed") return "Completed";
  return "Ready";
}

const tooltipStyle = {
  backgroundColor: "#111827",
  border: "1px solid #334155",
  borderRadius: "16px",
  color: "#E2E8F0",
};

const uploadColumnsFallback = 5;
