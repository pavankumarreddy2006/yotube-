import { PlayCircle } from "lucide-react";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function VideoPreviewPanel({ previewItems, youtubeLinks }) {
  const items = Array.isArray(previewItems) ? previewItems.filter((item) => item?.url) : [];
  const uploads = Array.isArray(youtubeLinks) ? youtubeLinks.filter((item) => item?.url) : [];

  return (
    <Card title="Video Preview" subtitle="Latest generated previews and live YouTube links from the last run.">
      {items.length === 0 && uploads.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="No preview yet"
          description="Generated long and short video links will appear here after the pipeline creates them."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.variant}</p>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="action-btn-secondary">
                  Open
                </a>
              </div>
              <video controls className="w-full rounded-2xl border border-white/10 bg-black/30">
                <source src={item.url} />
              </video>
            </div>
          ))}

          {uploads.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-sm font-medium text-white">Uploaded YouTube Links</p>
              <div className="space-y-2">
                {uploads.map((item) => (
                  <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="block text-sm text-highlight underline-offset-4 hover:underline">
                    {item.label}: {item.url}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
