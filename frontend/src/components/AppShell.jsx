import { Bell, Bot, ChevronDown, LoaderCircle, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

export function AppShell({
  children,
  navigation,
  currentPath,
  onNavigate,
  status,
  language,
  setLanguage,
  loading,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNavigate(path) {
    onNavigate(path);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[10%] top-[5%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-[30%] h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:84px_84px] opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 xl:block">
          <Sidebar
            navigation={navigation}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            status={status}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <header className="glass-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="ghost-button xl:hidden"
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI SPORTS AUTOMATION</p>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Production Control Center</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Monitor news intake, generate scripts, and keep the video pipeline moving without blocking the UI.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1">Local-first workflow</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">Telugu narration</span>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1">Daily automation</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={status} />
              <label className="glass-pill min-w-[170px] cursor-pointer justify-between">
                <span>{language === "en" ? "English" : "Telugu"}</span>
                <select
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  disabled={Boolean(status?.running)}
                >
                  <option value="te">Telugu</option>
                  <option value="en">English</option>
                </select>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </label>
              <div className="glass-pill gap-2">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> : <Bell className="h-4 w-4 text-cyan-300" />}
                <span>{loading ? "Syncing" : "Live"}</span>
              </div>
              <div className="glass-pill hidden 2xl:inline-flex gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span>Creator Mode</span>
              </div>
            </div>
          </header>

          {mobileOpen ? (
            <div className="xl:hidden">
              <Sidebar
                navigation={navigation}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                status={status}
                mobile
              />
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ navigation, currentPath, onNavigate, status, mobile = false }) {
  return (
    <div className={`glass-card flex h-full flex-col p-5 ${mobile ? "" : "min-h-[calc(100vh-2rem)]"}`}>
      <div className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb,#22c55e)] shadow-[0_12px_30px_rgba(34,211,238,0.28)]">
          <Bot className="h-6 w-6 text-slate-950" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Studio</p>
          <h2 className="text-xl font-semibold text-white">Sports Studio</h2>
          <p className="mt-1 text-xs text-slate-500">Run, review, improve</p>
        </div>
      </div>

      <nav className="mt-7 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition duration-300 ${
                active
                  ? "border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.18),rgba(34,197,94,0.16))] text-white"
                  : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-cyan-300" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-white">Pipeline Snapshot</p>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <SidebarMetric label="State" value={status?.statusLabel || "Idle"} />
          <SidebarMetric label="Stage" value={status?.progressLabel || "Waiting"} />
          <SidebarMetric label="Topic" value={status?.selectedTopic || "No topic selected"} />
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-cyan-400/10 bg-cyan-500/[0.05] p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Quick flow</p>
        <p className="mt-2 leading-6">Fetch news, generate Telugu script, build visuals, review previews, then upload only when the output looks right.</p>
      </div>
    </div>
  );
}

function SidebarMetric({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[150px] text-right font-medium text-white">{value}</span>
    </div>
  );
}
