import {
  Activity,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LoaderCircle,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";

const navSections = [
  { key: "content", label: "Automation" },
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
      <div className="ambient-layer" />

      <div className="relative mx-auto flex min-h-screen max-w-[1700px] gap-4 px-3 py-3 lg:gap-6 lg:px-5 lg:py-5">
        <aside className={`hidden shrink-0 xl:block ${collapsed ? "w-[108px]" : "w-[320px]"}`}>
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
          <header className="shell-topbar">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="icon-button xl:hidden"
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              <div className="brand-mark">
                <Bot className="h-6 w-6 text-slate-950" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    OrbitOps Automation
                  </h1>
                  <span className="brand-badge">Pro Control</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Modern AI video operations for Telugu and English sports publishing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="glass-pill min-w-[160px] cursor-pointer justify-between">
                <div>
                  <p className="eyebrow-label">Language</p>
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
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> : <Activity className="h-4 w-4 text-emerald-300" />}
                <div>
                  <p className="eyebrow-label">System</p>
                  <p className="text-sm text-white">{loading ? "Syncing" : "Online"}</p>
                </div>
              </div>

              <div className="glass-pill gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="eyebrow-label">Mode</p>
                  <p className="text-sm text-white">Automation Guarded</p>
                </div>
              </div>
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
      <div className={`sidebar-brand ${collapsed ? "justify-center" : ""}`}>
        <div className="brand-mark h-12 w-12">
          <Sparkles className="h-5 w-5 text-slate-950" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="eyebrow-label">Operations</p>
            <h2 className="font-display text-lg font-semibold text-white">Control Deck</h2>
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
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {active && !collapsed ? <span className="ml-auto h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.75)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="sidebar-snapshot">
          {!collapsed ? (
            <>
              <p className="eyebrow-label">Live Snapshot</p>
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
          <div className="operator-note">
            <p className="text-sm font-medium text-white">Operator flow</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Monitor feeds, launch scripts, render video, and review uploads from a calmer production workspace.
            </p>
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
    <div className="rounded-[24px] border border-rose-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.45),rgba(15,23,42,0.9))] px-4 py-4 text-sm text-rose-100 shadow-[0_20px_45px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-white">Automation alert</p>
          <p className="mt-1 text-rose-100/90">{message}</p>
        </div>
        <button type="button" onClick={onRetry} className="ghost-button border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20">
          Retry
        </button>
      </div>
    </div>
  );
}
