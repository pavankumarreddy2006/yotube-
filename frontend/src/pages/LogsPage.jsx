import { RotateCw } from "lucide-react";
import { LogsPanel } from "../components/LogsPanel";
import { SectionCard } from "../components/SectionCard";

export default function LogsPage({ dashboard }) {
  const { logs, refreshLogs, refreshState } = dashboard;

  return (
    <SectionCard
      title="Logs"
      description="Real-time operational logs from the backend pipeline."
      actions={
        <button type="button" onClick={refreshLogs} disabled={refreshState.logs} className="ghost-button">
          <RotateCw className={`h-4 w-4 ${refreshState.logs ? "animate-spin" : ""}`} />
          <span>Refresh logs</span>
        </button>
      }
    >
      <LogsPanel logs={logs} heightClass="max-h-[620px]" />
    </SectionCard>
  );
}
