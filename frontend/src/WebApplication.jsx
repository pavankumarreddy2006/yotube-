import {
  Bell,
  Bot,
  BrainCircuit,
  Clapperboard,
  Flame,
  Home,
  LayoutDashboard,
  Newspaper,
  Palette,
  Settings,
  Sparkles,
  Upload,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import { useDashboardData } from "./hooks/useDashboardData";

const navigation = [
  { key: "dashboard", label: "Home", path: "/dashboard", icon: Home, section: "overview" },
  { key: "video-generator", label: "Create Video", path: "/video-generator", icon: Clapperboard, section: "overview" },
  { key: "sports-news", label: "Sports News", path: "/sports-news", icon: Newspaper, section: "overview" },
  { key: "ai-content", label: "AI Studio", path: "/ai-content", icon: BrainCircuit, section: "studio" },
  { key: "thumbnails", label: "Thumbnails", path: "/thumbnails", icon: Palette, section: "studio" },
  { key: "uploads", label: "Uploads", path: "/uploads", icon: Upload, section: "studio" },
  { key: "analytics", label: "Analytics", path: "/analytics", icon: Bell, section: "intelligence" },
  { key: "automation", label: "Automation", path: "/automation", icon: Workflow, section: "ops" },
  { key: "settings", label: "Settings", path: "/settings", icon: Settings, section: "ops" },
];

const quickActions = [
  { key: "run", label: "Start automation", icon: Sparkles },
  { key: "monitor", label: "Live monitoring", icon: LayoutDashboard },
  { key: "trends", label: "Trending sports", icon: Flame },
];

export default function WebApplication() {
  const dashboard = useDashboardData();
  const [currentPath, setCurrentPath] = useState("/dashboard");
  const [theme, setTheme] = useState("dark");

  const currentItem = useMemo(
    () => navigation.find((item) => item.path === currentPath) || navigation[0],
    [currentPath]
  );

  return (
    <AppShell
      navigation={navigation}
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      status={dashboard.status}
      language={dashboard.language}
      setLanguage={dashboard.setLanguage}
      loading={dashboard.bootstrapLoading}
      error={dashboard.error}
      onRetry={dashboard.refreshStatus}
      theme={theme}
      onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      workspace={{
        name: "CreatorOS AI",
        plan: "Autonomous Sports Studio",
        icon: Bot,
      }}
      quickActions={quickActions}
    >
      <DashboardPage dashboard={dashboard} currentPath={currentPath} currentItem={currentItem} />
    </AppShell>
  );
}
