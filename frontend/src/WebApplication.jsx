import { Bot, LayoutDashboard } from "lucide-react";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import { useDashboardData } from "./hooks/useDashboardData";

const navigation = [
  {
    key: "dashboard",
    label: "Automation Center",
    shortLabel: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "content",
  },
];

export default function WebApplication() {
  const dashboard = useDashboardData();

  return (
    <AppShell
      navigation={navigation}
      currentPath="/dashboard"
      onNavigate={() => {}}
      status={dashboard.status}
      language={dashboard.language}
      setLanguage={dashboard.setLanguage}
      loading={dashboard.bootstrapLoading}
      error={dashboard.error}
      onRetry={dashboard.refreshStatus}
      brandIcon={Bot}
    >
      <DashboardPage dashboard={dashboard} />
    </AppShell>
  );
}
