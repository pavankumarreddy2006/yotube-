import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Crown,
  LogOut,
  Menu,
  MoonStar,
  Search,
  Settings2,
  Sparkles,
  SunMedium,
  UserCircle2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";

const groups = [
  { key: "overview", label: "Home" },
  { key: "studio", label: "Create" },
  { key: "intelligence", label: "Insights" },
  { key: "ops", label: "Control" },
];

const mobileNavKeys = ["/dashboard", "/video-generator", "/sports-news", "/uploads", "/settings"];

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
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
    if (!term) {
      return navigation;
    }
    return navigation.filter((item) => item.label.toLowerCase().includes(term));
  }, [navigation, query]);

  const currentItem = navigation.find((item) => item.path === currentPath) || navigation[0];
  const mobileItems = navigation.filter((item) => mobileNavKeys.includes(item.path));
  const notifications = Array.isArray(status?.notifications) ? status.notifications.slice(-5).reverse() : [];

  function handleNavigate(path) {
    onNavigate(path);
    setMobileOpen(false);
    setCommandOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setQuery("");
  }

  return (
    <div className="app-root">
      <div className="app-backdrop" />
      <div className="app-backdrop-secondary" />

      <div className="relative flex min-h-screen">
        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.button
                type="button"
                aria-label="Close navigation overlay"
                className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[340px] lg:hidden"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
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
          animate={{ width: collapsed ? 96 : 300 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
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
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">CreatorOS AI</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-[var(--text-main)] sm:text-xl">{currentItem.label}</h1>
                  <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] sm:inline-flex">
                    {status?.statusLabel || "Idle"}
                  </span>
                </div>
              </div>
            </div>

            <button type="button" className="search-shell" onClick={() => setCommandOpen(true)} aria-label="Open command menu">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text-secondary)]">Search pages, actions, topics, and pipeline tasks</span>
              <span className="hidden rounded-xl border border-[var(--border)] bg-white/5 px-2 py-1 text-[11px] text-[var(--text-secondary)] sm:inline-flex">
                Cmd + K
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden xl:block">
                <StatusBadge status={status} />
              </div>

              <div className="relative">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Open notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => {
                    setNotificationsOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                >
                  <Bell className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {notificationsOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="popover-panel right-0 top-[calc(100%+12px)] w-[min(92vw,360px)]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-main)]">Notifications</p>
                          <p className="text-xs text-[var(--text-secondary)]">Latest automation updates</p>
                        </div>
                        <button type="button" className="chip-button" onClick={() => setNotificationsOpen(false)}>
                          Dismiss
                        </button>
                      </div>
                      <div className="mt-4 space-y-2">
                        {notifications.length ? (
                          notifications.map((item) => (
                            <button key={item.id} type="button" className="news-inline-row">
                              <div className="status-dot status-dot-accent shrink-0" />
                              <div className="min-w-0 text-left">
                                <p className="truncate text-sm text-[var(--text-main)]">{item.message}</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.timestamp || "Realtime event"}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="empty-state text-sm">No new notifications.</div>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button type="button" className="icon-button" aria-label="Toggle theme" onClick={onToggleTheme}>
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </button>

              <button type="button" className="primary-button hidden sm:inline-flex" onClick={() => setCommandOpen(true)}>
                <Sparkles className="h-4 w-4" />
                Quick Create
              </button>

              <div className="relative">
                <button
                  type="button"
                  className="profile-chip"
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    setProfileOpen((value) => !value);
                    setNotificationsOpen(false);
                  }}
                >
                  <UserCircle2 className="h-8 w-8 text-[var(--text-main)]" />
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-[var(--text-main)]">Operator</p>
                    <p className="text-xs text-[var(--text-secondary)]">{workspace.plan}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-[var(--text-secondary)] sm:block" />
                </button>
                <AnimatePresence>
                  {profileOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="popover-panel right-0 top-[calc(100%+12px)] w-[260px]"
                    >
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-semibold text-[var(--text-main)]">Sports AI Studio</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Premium production workspace</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <button type="button" className="command-item">
                          <UserCircle2 className="h-4 w-4" />
                          Profile
                        </button>
                        <button type="button" className="command-item" onClick={() => handleNavigate("/settings")}>
                          <Settings2 className="h-4 w-4" />
                          Workspace settings
                        </button>
                        <button type="button" className="command-item">
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </header>
          <LiveStatusBar status={status} />

          {error ? (
            <div className="px-4 pb-0 pt-4 sm:px-6 xl:px-8">
              <div className="alert-banner">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-main)]">Live sync issue detected</p>
                  <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                </div>
                <button type="button" className="secondary-button" onClick={onRetry}>
                  Retry sync
                </button>
              </div>
            </div>
          ) : null}

          <main className="page-shell">{children}</main>
        </div>
      </div>

      <BottomNav navigation={mobileItems} currentPath={currentPath} onNavigate={handleNavigate} />

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
        status={status}
      />
    </div>
  );
}

function LiveStatusBar({ status }) {
  const toneClass = status?.failed ? "text-[var(--danger)]" : status?.running ? "text-[var(--success)]" : "text-[var(--text-main)]";
  const eta = typeof status?.etaSeconds === "number" && status.etaSeconds > 0 ? formatEta(status.etaSeconds) : "Ready";
  return (
    <div className="live-status-bar">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-sm font-semibold ${toneClass}`}>{status?.running ? "AI System Active" : status?.failed ? "Attention Needed" : "Studio Ready"}</span>
        <span className="live-status-chip">{status?.progressLabel || "Idle"}</span>
        <span className="live-status-chip">{status?.currentTask || "Waiting for the next automation run"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
        <span>{status?.uploadStatus?.active ? "Uploading to YouTube" : status?.renderStatus?.active ? "Rendering Video" : "Standing by"}</span>
        <span>ETA: {eta}</span>
      </div>
    </div>
  );
}

function formatEta(value) {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
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
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Workspace</p>
            <h2 className="truncate text-base font-semibold text-[var(--text-main)]">{workspace.name}</h2>
          </div>
        ) : null}
        {!mobile ? (
          <button type="button" className="icon-button" aria-label="Toggle sidebar width" onClick={onToggleCollapse}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : (
          <button type="button" className="icon-button" aria-label="Close navigation" onClick={() => onNavigate(currentPath)}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={`workspace-panel mt-6 ${collapsed ? "px-3 py-4" : ""}`}>
        <div className={`flex items-start gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className={`status-dot ${status?.failed ? "status-dot-danger" : status?.running ? "status-dot-warning" : "status-dot-success"} mt-1`} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-main)]">{status?.statusLabel || "Idle"}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{status?.currentTask || "Waiting for next event"}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">{status?.languageLabel || "Telugu"} workflow</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
        {groupedNavigation.map((group) => (
          <div key={group.key}>
            {!collapsed ? <p className="px-3 text-[11px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">{group.label}</p> : null}
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.path === currentPath;
                return (
                  <motion.button
                    key={item.key}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className={`nav-button ${active ? "nav-button-active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
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
          {collapsed ? (
            theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />
          ) : (
            <>
              <span>{theme === "dark" ? "Switch to light" : "Switch to dark"}</span>
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </>
          )}
        </button>

        <div className={`upgrade-card ${collapsed ? "items-center justify-center px-3" : ""}`}>
          <Crown className="h-5 w-5 shrink-0 text-amber-300" />
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-main)]">Upgrade workspace</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Priority renders, deeper analytics, and premium support.</p>
              </div>
              <button type="button" className="primary-button h-10 px-4 text-xs">
                Go Premium
              </button>
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
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CommandDialog({ open, onClose, query, onQueryChange, items, onSelect, language, setLanguage, loading, quickActions, status }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close command menu"
            className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="command-dialog"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="Jump to a page, workflow, or action"
              />
              <button type="button" className="icon-button" onClick={onClose} aria-label="Close command menu">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-2">
                <p className="section-kicker">Navigation</p>
                {items.map((item) => (
                  <button key={item.key} type="button" className="command-item" onClick={() => onSelect(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                  </button>
                ))}
                {!items.length ? <div className="empty-state text-sm">No matching destinations.</div> : null}
              </div>

              <div className="space-y-3">
                <div className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
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

                <div className="rounded-[24px] border border-[var(--border)] bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-[var(--text-main)]">Workspace controls</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Language</span>
                    <select className="select-shell w-[156px]" value={language} onChange={(event) => setLanguage(event.target.value)}>
                      <option value="te">Telugu</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">System</p>
                    <p className="mt-2 text-sm text-[var(--text-main)]">{status?.currentStage || "Realtime feed connected"}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {loading ? "Refreshing dashboard snapshot..." : "Command surface is live and ready."}
                    </p>
                  </div>
                  <button type="button" className="secondary-button mt-4 w-full justify-center" onClick={onClose}>
                    <Command className="h-4 w-4" />
                    Close Command Menu
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
