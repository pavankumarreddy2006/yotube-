import {
  BellRing,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LoaderCircle,
  Menu,
  UserCircle2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";

const navSections = [
  { key: "content", label: "Content" },
  { key: "media", label: "Media" },
  { key: "system", label: "System" },
];

export function AppShell({
  children,
  navigation,
  currentPath,
  onNavigate,
  status,
  language,
  setLanguage,
  loading,
  error,
  onRetry,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const groupedNavigation = useMemo(
    () =>
      navSections.map((section) => ({
        ...section,
        items: navigation.filter((item) => item.section === section.key),
      })),
    [navigation]
  );

  function handleNavigate(path) {
    onNavigate(path);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_34%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.14),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1680px] gap-4 px-3 py-3 lg:gap-6 lg:px-5 lg:py-5">
        <aside className={`hidden shrink-0 xl:block ${collapsed ? "w-[104px]" : "w-[290px]"}`}>
          <Sidebar
            groupedNavigation={groupedNavigation}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            status={status}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-4 lg:space-y-6">
          <header className="app-frame flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="icon-button xl:hidden"
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb,#7c3aed)] shadow-[0_20px_45px_rgba(59,130,246,0.35)]">
                <Bot className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">AstraFlow Studio</h1>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200">
                    Premium
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">AI video operations dashboard for Telugu content automation.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="glass-pill min-w-[160px] cursor-pointer justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Language</p>
                  <span className="mt-1 block text-sm text-white">{language === "en" ? "English" : "Telugu"}</span>
                </div>
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
              <StatusBadge status={status} />
              <div className="glass-pill gap-3">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> : <BellRing className="h-4 w-4 text-cyan-300" />}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">System</p>
                  <p className="text-sm text-white">{loading ? "Syncing" : "Realtime"}</p>
                </div>
              </div>
              <button type="button" className="glass-pill gap-3">
                <UserCircle2 className="h-8 w-8 text-slate-300" />
                <div className="hidden text-left sm:block">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Operator</p>
                  <p className="text-sm text-white">Control Admin</p>
                </div>
              </button>
            </div>
          </header>

          {mobileOpen ? (
            <div className="xl:hidden">
              <Sidebar
                groupedNavigation={groupedNavigation}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                status={status}
                mobile
              />
            </div>
          ) : null}

          {error ? <ToastBanner message={error} onRetry={onRetry} /> : null}

          {children}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ groupedNavigation, currentPath, onNavigate, status, collapsed = false, onToggleCollapse, mobile = false }) {
  return (
    <div className={`app-frame flex h-full flex-col px-3 py-4 ${mobile ? "" : "min-h-[calc(100vh-1.5rem)]"}`}>
      <div className={`flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(34,211,238,0.9),rgba(59,130,246,0.9),rgba(124,58,237,0.8))] shadow-[0_18px_32px_rgba(59,130,246,0.25)]">
          <Bot className="h-6 w-6 text-slate-950" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Navigation</p>
            <h2 className="font-display text-lg font-semibold text-white">Control Stack</h2>
          </div>
        ) : null}
        {!mobile && onToggleCollapse ? (
          <button type="button" onClick={onToggleCollapse} className="icon-button">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <nav className="mt-6 space-y-5">
        {groupedNavigation.map((section) => (
          <div key={section.key}>
            {!collapsed ? <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">{section.label}</p> : null}
            <div className="mt-2 space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.path;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className={`nav-item ${active ? "nav-item-active" : "nav-item-idle"} ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-200" : "text-slate-400"}`} />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {active && !collapsed ? <span className="ml-auto h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          {!collapsed ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live Snapshot</p>
              <div className="mt-4 space-y-3">
                <SidebarMetric label="Status" value={status?.statusLabel || "Idle"} />
                <SidebarMetric label="Stage" value={status?.currentStage || status?.progressLabel || "Queued"} />
                <SidebarMetric label="Topic" value={status?.selectedTopic || "No topic selected"} />
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <div className={`h-3 w-3 rounded-full ${status?.failed ? "bg-rose-400" : status?.running ? "bg-amber-300" : "bg-emerald-300"} shadow-[0_0_18px_currentColor]`} />
            </div>
          )}
        </div>
        {!collapsed ? (
          <div className="rounded-[24px] border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(8,145,178,0.12),rgba(15,23,42,0.4))] p-4">
            <p className="text-sm font-medium text-white">Operator flow</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Pick a story, generate a Telugu script, verify media quality, and publish with full pipeline visibility.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SidebarMetric({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[150px] text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function ToastBanner({ message, onRetry }) {
  return (
    <div className="rounded-[22px] border border-rose-500/20 bg-[linear-gradient(180deg,rgba(244,63,94,0.14),rgba(15,23,42,0.8))] px-4 py-3 text-sm text-rose-100 shadow-[0_20px_45px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-white">Automation alert</p>
          <p className="mt-1 text-rose-100/90">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
