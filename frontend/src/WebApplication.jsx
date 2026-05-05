import { Suspense, lazy, useMemo } from "react";
import {
  Activity,
  FileImage,
  FileText,
  LayoutDashboard,
  Newspaper,
  PlayCircle,
  Settings,
  TerminalSquare,
} from "lucide-react";
import { AppShell } from "./components/AppShell";
import { PageSkeleton } from "./components/PageSkeleton";
import { useDashboardData } from "./hooks/useDashboardData";
import { useNavigation } from "./hooks/useNavigation";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LiveNewsPage = lazy(() => import("./pages/LiveNewsPage"));
const ScriptGeneratorPage = lazy(() => import("./pages/ScriptGeneratorPage"));
const VideoManagerPage = lazy(() => import("./pages/VideoManagerPage"));
const AssetsPage = lazy(() => import("./pages/AssetsPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const routes = [
  { key: "dashboard", label: "Overview", shortLabel: "Home", path: "/dashboard", icon: LayoutDashboard, component: DashboardPage, section: "overview" },
  { key: "news", label: "News", shortLabel: "News", path: "/dashboard/news", icon: Newspaper, component: LiveNewsPage, section: "content" },
  { key: "scripts", label: "Scripts", shortLabel: "Scripts", path: "/dashboard/scripts", icon: FileText, component: ScriptGeneratorPage, section: "content" },
  { key: "videos", label: "Videos", shortLabel: "Videos", path: "/dashboard/videos", icon: PlayCircle, component: VideoManagerPage, section: "media" },
  { key: "assets", label: "Assets", shortLabel: "Assets", path: "/dashboard/assets", icon: FileImage, component: AssetsPage, section: "media" },
  { key: "logs", label: "Logs", shortLabel: "Logs", path: "/dashboard/logs", icon: TerminalSquare, component: LogsPage, section: "system" },
  { key: "settings", label: "Settings", shortLabel: "Settings", path: "/dashboard/settings", icon: Settings, component: Activity, section: "system" },
];

const resolvedRoutes = routes.map((route) => ({
  ...route,
  component: route.key === "settings" ? SettingsPage : route.component,
}));

export default function WebApplication() {
  const dashboard = useDashboardData();
  const navigation = useNavigation(resolvedRoutes.map((route) => route.path));

  const currentRoute = useMemo(
    () => resolvedRoutes.find((route) => route.path === navigation.pathname) || resolvedRoutes[0],
    [navigation.pathname]
  );

  const CurrentPage = currentRoute.component;

  return (
    <AppShell
      navigation={resolvedRoutes}
      currentPath={navigation.pathname}
      onNavigate={navigation.navigate}
      status={dashboard.status}
      language={dashboard.language}
      setLanguage={dashboard.setLanguage}
      loading={dashboard.bootstrapLoading}
      error={dashboard.error}
      onRetry={dashboard.refreshStatus}
    >
      <Suspense fallback={<PageSkeleton />}>
        <CurrentPage
          dashboard={dashboard}
          onNavigate={navigation.navigate}
          currentPath={navigation.pathname}
        />
      </Suspense>
    </AppShell>
  );
}
