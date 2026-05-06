import {
  Bell,
  ChevronRight,
  Command,
  Crown,
  Menu,
  MoonStar,
  Search,
  SunMedium,
  UserCircle2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";

const groups = [
  { key: "overview", label: "Overview" },
  { key: "studio", label: "Studio" },
  { key: "intelligence", label: "Intelligence" },
  { key: "ops", label: "Operations" },
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
  theme,
  onToggleTheme,
  workspace,
  quickActions,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groupedNavigation = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        items: navigation.filter((item) => item.section === group.key),
      })),
    [navigation]
  );

  const filteredCommands = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return navigation;
    return navigation.filter((item) => item.label.toLowerCase().includes(term));
  }, [navigation, query]);

  const currentItem = navigation.find((item) => item.path === currentPath) || navigation[0];

  function handleNavigate(path) {
    onNavigate(path);
    setMobileOpen(false);
    setCommandOpen(false);
    setQuery("");
  }

  return (
    <div className="app-root">
      <div className="app-backdrop" />
      <div className="relative flex min-h-screen">
        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.button
                aria-label="Close navigation overlay"
                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] lg:hidden"
                initial={{ x: -32, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -32, opacity: 0 }}
              >
                <Sidebar
                  groupedNavigation={groupedNavigation}
                  currentPath={currentPath}
                  onNavigate={handleNavigate}
                  status={status}
                  collapsed={false}
                  mobile
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  workspace={workspace}
                />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <motion.aside
          animate={{ width: collapsed ? 92 : 288 }}
          className="hidden shrink-0 lg:block"
        >
          <Sidebar
            groupedNavigation={groupedNavigation}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            status={status}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            theme={theme}
            onToggleTheme={onToggleTheme}
            workspace={workspace}
          />
        </motion.aside>

        <div className="min-w-0 flex-1">
          <header className="topbar">
            <div className="flex items-center gap-3">
              <button type="button" className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden min-w-0 lg:block">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <h1 className="truncate text-lg font-semibold text-[var(--text-main)]">{currentItem.label}</h1>
              </div>
            </div>

            <button type="button" className="search-shell" onClick={() => setCommandOpen(true)} aria-label="Open command menu">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-left text-sm text-slate-400">Search actions, pages, topics...</span>
              <span className="rounded-xl border border-[var(--border)] px-2 py-1 text-[11px] text-slate-400">Cmd + K</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden xl:block">
                <StatusBadge status={status} />
              </div>
              <button type="button" className="icon-button" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <button type="button" className="icon-button" aria-label="Toggle theme" onClick={onToggleTheme}>
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </button>
              <button type="button" className="primary-button h-11 px-4 text-sm" onClick={() => setCommandOpen(true)}>
                <Command className="h-4 w-4" />
                Quick Create
              </button>
              <button type="button" className="profile-chip" aria-label="Open profile menu">
                <UserCircle2 className="h-8 w-8 text-[var(--text-main)]" />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-[var(--text-main)]">Operator</p>
                  <p className="text-xs text-[var(--text-secondary)]">{workspace.plan}</p>
                </div>
              </button>
            </div>
          </header>

          {error ? (
            <div className="px-4 pb-0 pt-4 sm:px-6 xl:px-8">
              <div className="alert-banner">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-main)]">Sync issue detected</p>
                  <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                </div>
                <button type="button" className="secondary-button" onClick={onRetry}>
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <main className="px-4 pb-28 pt-4 sm:px-6 xl:px-8">
            {children}
          </main>
        </div>
      </div>

      <BottomNav navigation={navigation.slice(0, 5)} currentPath={currentPath} onNavigate={handleNavigate} />
      <CommandDialog
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        query={query}
        onQueryChange={setQuery}
        items={filteredCommands}
        onSelect={handleNavigate}
        language={language}
        setLanguage={setLanguage}
        loading={loading}
        quickActions={quickActions}
      />
    </div>
  );
}

function Sidebar({
  groupedNavigation,
  currentPath,
  onNavigate,
  status,
  collapsed,
  onToggleCollapse,
  mobile = false,
  theme,
  onToggleTheme,
  workspace,
}) {
  const WorkspaceIcon = workspace.icon;

  return (
    <div className={`sidebar-shell ${mobile ? "h-full" : "min-h-screen"}`}>
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="logo-mark">
          <WorkspaceIcon className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Workspace</p>
            <h2 className="truncate text-base font-semibold text-[var(--text-main)]">{workspace.name}</h2>
          </div>
        ) : null}
        {!mobile ? (
          <button type="button" className="icon-button" aria-label="Toggle sidebar width" onClick={onToggleCollapse}>
            <ChevronRight className={`h-4 w-4 transition ${collapsed ? "" : "rotate-180"}`} />
          </button>
        ) : (
          <button type="button" className="icon-button" aria-label="Close navigation" onClick={() => onNavigate(currentPath)}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-white/5 p-4">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className={`h-2.5 w-2.5 rounded-full ${status?.failed ? "bg-[var(--danger)]" : status?.running ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`} />
          {!collapsed ? (
            <div>
              <p className="text-sm font-medium text-[var(--text-main)]">{status?.statusLabel || "Idle"}</p>
              <p className="text-xs text-[var(--text-secondary)]">{status?.currentStage || "Waiting for next event"}</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
        {groupedNavigation.map((group) => (
          <div key={group.key}>
            {!collapsed ? <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">{group.label}</p> : null}
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.path === currentPath;
                return (
                  <motion.button
                    key={item.key}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className={`nav-button ${active ? "nav-button-active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 pt-6">
        <button type="button" className={`secondary-button w-full justify-between ${collapsed ? "px-0" : ""}`} onClick={onToggleTheme}>
          {collapsed ? (theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />) : <>
            <span>{theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </>}
        </button>
        <div className={`upgrade-card ${collapsed ? "items-center px-3" : ""}`}>
          <Crown className="h-5 w-5 text-amber-300" />
          {!collapsed ? (
            <>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">Upgrade workspace</p>
                <p className="text-xs text-[var(--text-secondary)]">Priority rendering and deeper analytics.</p>
              </div>
              <button type="button" className="primary-button h-10 px-4 text-xs">Go Premium</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ navigation, currentPath, onNavigate }) {
  return (
    <div className="bottom-nav lg:hidden">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = item.path === currentPath;
        return (
          <button key={item.key} type="button" onClick={() => onNavigate(item.path)} className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}>
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CommandDialog({ open, onClose, query, onQueryChange, items, onSelect, language, setLanguage, loading, quickActions }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close command menu"
            className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="command-dialog"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-slate-500"
                placeholder="Jump to a page or action"
              />
              <button type="button" className="icon-button" onClick={onClose} aria-label="Close command menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-2">
                {items.map((item) => (
                  <button key={item.key} type="button" className="command-item" onClick={() => onSelect(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
                {!items.length ? <div className="empty-state text-sm">No matching destinations.</div> : null}
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Quick actions</p>
                  <div className="mt-3 space-y-2">
                    {quickActions.map((action) => (
                      <button key={action.key} type="button" className="command-item">
                        <action.icon className="h-4 w-4" />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Workspace controls</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Language</span>
                    <select className="select-shell w-[150px]" value={language} onChange={(event) => setLanguage(event.target.value)}>
                      <option value="te">Telugu</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">{loading ? "Refreshing dashboard snapshot..." : "Realtime system feed is connected."}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
