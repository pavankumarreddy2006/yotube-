import { CloudUpload, Play, RotateCcw } from "lucide-react";
import Card from "./Card";

export default function ControlPanel({ onRun, onRetry, onUpload, actionState }) {
  const buttons = [
    {
      key: "run",
      label: actionState.run ? "Running..." : "Run Now",
      icon: Play,
      onClick: onRun,
      className: "action-btn-primary"
    },
    {
      key: "retry",
      label: actionState.retry ? "Retrying..." : "Retry Failed Task",
      icon: RotateCcw,
      onClick: onRetry,
      className: "action-btn-secondary"
    },
    {
      key: "upload",
      label: actionState.upload ? "Uploading..." : "Upload Again",
      icon: CloudUpload,
      onClick: onUpload,
      className: "action-btn-secondary"
    }
  ];

  return (
    <Card title="Control Panel" subtitle="Manual actions to steer or recover the automation pipeline.">
      <div className="grid gap-3 sm:grid-cols-3">
        {buttons.map((button) => {
          const Icon = button.icon;
          return (
            <button
              key={button.key}
              type="button"
              onClick={button.onClick}
              disabled={actionState[button.key]}
              className={`${button.className} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Icon className="h-4 w-4" />
              {button.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
