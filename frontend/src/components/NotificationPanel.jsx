import { BellRing } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function NotificationPanel({ notifications }) {
  const items = Array.isArray(notifications) ? notifications : [];

  return (
    <Card title="Notifications" subtitle="Latest Telegram alerts and system messages.">
      {items.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No notifications yet"
          description="Telegram messages will appear here after the backend includes them in the status feed."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id || index} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <BellRing className="h-4 w-4 text-cyan-300" />
                  Alert
                </div>
                <span className="text-xs text-slate-400">{formatTimestamp(item.timestamp || item.time)}</span>
              </div>
              <p className="text-sm leading-6 text-slate-200">{item.message || item.text || String(item)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
