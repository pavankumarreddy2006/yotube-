import { Suspense, lazy, useMemo } from "react";
import {
  Activity,
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
const LogsPage = lazy(() => import("./pages/LogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const routes = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, component: DashboardPage },
  { key: "news", label: "Live News", path: "/dashboard/news", icon: Newspaper, component: LiveNewsPage },
  { key: "scripts", label: "Script Generator", path: "/dashboard/scripts", icon: FileText, component: ScriptGeneratorPage },
  { key: "videos", label: "Video Manager", path: "/dashboard/videos", icon: PlayCircle, component: VideoManagerPage },
  { key: "logs", label: "Logs", path: "/dashboard/logs", icon: TerminalSquare, component: LogsPage },
  { key: "settings", label: "Settings", path: "/dashboard/settings", icon: Settings, component: Activity },
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
