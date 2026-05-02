import { AlertTriangle } from "lucide-react";

export default function ErrorBanner({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-rose-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
        <div>
          <p className="font-medium text-white">API connection issue</p>
          <p className="mt-1 text-rose-100/90">{message}</p>
        </div>
      </div>
    </div>
  );
}
