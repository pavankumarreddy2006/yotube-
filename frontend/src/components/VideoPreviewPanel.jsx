import { ExternalLink, PlayCircle, UploadCloud, Video } from "lucide-react";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function VideoPreviewPanel({ previewItems, youtubeLinks, thumbnailUrl, onUpload, uploadLoading, running }) {
  const items = Array.isArray(previewItems) ? previewItems.filter((item) => item?.url) : [];
  const uploads = Array.isArray(youtubeLinks) ? youtubeLinks.filter((item) => item?.url) : [];

  return (
    <Card
      title="Video Manager"
      subtitle="Generated assets, previews, and upload destinations for the latest run."
      action={
        <button
          type="button"
          onClick={onUpload}
          disabled={running || uploadLoading}
          className="action-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadCloud className={`h-4 w-4 ${uploadLoading ? "animate-bounce" : ""}`} />
          {uploadLoading ? "Uploading..." : "Upload Latest"}
        </button>
      }
    >
      {items.length === 0 && uploads.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="No videos yet"
          description="Generated videos, thumbnails, and YouTube links will appear here after the next automation cycle."
        />
      ) : (
        <div className="space-y-4">
          {thumbnailUrl ? (
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Latest Thumbnail</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Asset Preview</p>
                </div>
                <Video className="h-4 w-4 text-cyan-300" />
              </div>
              <img src={thumbnailUrl} alt="Latest generated thumbnail" className="h-56 w-full object-cover" />
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <div key={item.label} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
                <div className="relative border-b border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.4),rgba(14,165,233,0.18),rgba(109,40,217,0.18))] p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%)]" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">{item.variant}</p>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="action-btn-secondary">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </div>
                </div>
                <div className="bg-slate-950/40 p-4">
                  <video controls className="aspect-video w-full rounded-[22px] border border-white/10 bg-black/60 object-cover">
                    <source src={item.url} />
                  </video>
                </div>
              </div>
            ))}
          </div>

          {uploads.length ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-white">Published Links</p>
              <div className="mt-3 space-y-2">
                {uploads.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/12"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-4 w-4" />
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
