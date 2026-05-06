import {
  Bell,
  Bot,
  BrainCircuit,
  CircleDollarSign,
  Clapperboard,
  Command,
  LayoutDashboard,
  Newspaper,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import { useDashboardData } from "./hooks/useDashboardData";

const navigation = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, section: "overview" },
  { key: "sports-news", label: "Sports News", path: "/sports-news", icon: Newspaper, section: "overview" },
  { key: "ai-content", label: "AI Content", path: "/ai-content", icon: BrainCircuit, section: "studio" },
  { key: "video-generator", label: "Video Generator", path: "/video-generator", icon: Clapperboard, section: "studio" },
  { key: "uploads", label: "Uploads", path: "/uploads", icon: Upload, section: "studio" },
  { key: "analytics", label: "Analytics", path: "/analytics", icon: Bell, section: "intelligence" },
  { key: "teams-players", label: "Teams & Players", path: "/teams-players", icon: Trophy, section: "intelligence" },
  { key: "automation", label: "Automation", path: "/automation", icon: Workflow, section: "ops" },
  { key: "monetization", label: "Monetization", path: "/monetization", icon: CircleDollarSign, section: "ops" },
  { key: "settings", label: "Settings", path: "/settings", icon: Settings, section: "ops" },
];

const quickActions = [
  { key: "run", label: "Start automation", icon: Sparkles },
  { key: "command", label: "Command menu", icon: Command },
  { key: "guard", label: "Automation guarded", icon: ShieldCheck },
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
        name: "Sports AI Studio",
        plan: "Growth Workspace",
        icon: Bot,
      }}
      quickActions={quickActions}
    >
      <DashboardPage dashboard={dashboard} currentPath={currentPath} currentItem={currentItem} />
    </AppShell>
  );
}
