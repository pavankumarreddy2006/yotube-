import {
  Bell,
  Bot,
  BrainCircuit,
  Clapperboard,
  Flame,
  Home,
  Newspaper,
  Palette,
  Rocket,
  Settings,
  Sparkles,
  Upload,
  Workflow,
  BarChart3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import { useDashboardData } from "./hooks/useDashboardData";

const navigation = [
  { key: "dashboard", label: "Home", path: "/dashboard", icon: Home, section: "overview" },
  { key: "video-generator", label: "Create Video", path: "/video-generator", icon: Clapperboard, section: "overview" },
  { key: "sports-news", label: "Sports News", path: "/sports-news", icon: Newspaper, section: "overview" },
  { key: "ai-content", label: "AI Studio", path: "/ai-content", icon: BrainCircuit, section: "studio" },
  { key: "thumbnails", label: "Thumbnails", path: "/thumbnails", icon: Palette, section: "studio" },
  { key: "uploads", label: "My Uploads", path: "/uploads", icon: Upload, section: "studio" },
  { key: "analytics", label: "My Performance", path: "/analytics", icon: BarChart3, section: "intelligence" },
  { key: "automation", label: "Smart Automation", path: "/automation", icon: Workflow, section: "ops" },
  { key: "settings", label: "Settings", path: "/settings", icon: Settings, section: "ops" },
];

const quickActions = [
  { key: "run", label: "Create new video", icon: Sparkles },
  { key: "monitor", label: "Open AI studio", icon: Rocket },
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

  useEffect(() => {
    const seoMap = {
      "/dashboard": {
        title: "CreatorOS Dashboard | AI Sports Video Studio",
        description: "Plan, create, render, and upload AI-powered sports videos, YouTube Shorts, and thumbnails from one clean CreatorOS dashboard.",
      },
      "/video-generator": {
        title: "Create Sports Videos | CreatorOS",
        description: "Turn cricket, football, and trending sports stories into AI-generated videos, Shorts, and highlight clips with CreatorOS.",
      },
      "/sports-news": {
        title: "Trending Sports News | CreatorOS",
        description: "Discover trending sports stories and quickly turn them into engaging video ideas with CreatorOS.",
      },
      "/ai-content": {
        title: "AI Studio | CreatorOS",
        description: "Watch CreatorOS research, write, voice, and produce sports video content in real time.",
      },
      "/thumbnails": {
        title: "AI Sports Thumbnails | CreatorOS",
        description: "Create bold, high-converting thumbnails for sports videos and YouTube Shorts with CreatorOS.",
      },
      "/uploads": {
        title: "Upload Queue | CreatorOS",
        description: "Track YouTube uploads, progress, retries, and publish status inside CreatorOS.",
      },
      "/analytics": {
        title: "Performance Analytics | CreatorOS",
        description: "Understand views, watch time, video output, and growth with simple CreatorOS analytics.",
      },
      "/automation": {
        title: "Smart Automation | CreatorOS",
        description: "Automate sports research, script writing, Telugu voiceovers, thumbnails, and YouTube uploads with CreatorOS.",
      },
      "/settings": {
        title: "Settings | CreatorOS",
        description: "Customize language, video modes, uploads, and studio preferences in CreatorOS.",
      },
    };

    const seo = seoMap[currentPath] || seoMap["/dashboard"];
    document.title = seo.title;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }
    description.setAttribute("content", seo.description);
  }, [currentPath]);

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
        name: "CreatorOS",
        plan: "AI-Powered Sports Video Studio",
        icon: Bot,
      }}
      quickActions={quickActions}
    >
      <DashboardPage dashboard={dashboard} currentPath={currentPath} currentItem={currentItem} />
    </AppShell>
  );
}
