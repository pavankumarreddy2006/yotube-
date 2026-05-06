import { RotateCw } from "lucide-react";
import { LogsPanel } from "../components/LogsPanel";
import { SectionCard } from "../components/SectionCard";

export default function LogsPage({ dashboard }) {
  const { logs, refreshStatus, statusLoading } = dashboard;

  return (
    <SectionCard
      title="Logs"
      description="Real-time operational logs from the backend pipeline with live refresh controls."
      actions={
        <button type="button" onClick={refreshStatus} disabled={statusLoading} className="ghost-button">
          <RotateCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
          <span>Refresh logs</span>
        </button>
      }
    >
      <LogsPanel logs={logs} heightClass="max-h-[620px]" />
    </SectionCard>
  );
}
