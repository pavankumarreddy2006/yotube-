import { ExternalLink, RefreshCcw, Rocket, Video } from "lucide-react";
import { SectionCard } from "../components/SectionCard";

export default function VideoManagerPage({ dashboard }) {
  const { status, runNow, actionState } = dashboard;
  const previewItems = status?.previewItems || [];
  const uploadItems = status?.youtubeLinks || [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard
        title="Video Preview"
        description="Frontend-served preview artifacts from the latest completed run."
        actions={
          <button type="button" onClick={runNow} disabled={Boolean(status?.running) || actionState.run} className="ghost-button">
            <RefreshCcw className={`h-4 w-4 ${actionState.run ? "animate-spin" : ""}`} />
            <span>Run again</span>
          </button>
        }
      >
        <div className="space-y-4">
          {previewItems.length ? (
            previewItems.map((item, index) => (
              <div key={`${item.url}-${index}`} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 lg:w-[280px]">
                    {item.url ? (
                      <video src={item.url} controls preload="metadata" className="h-full w-full" />
                    ) : (
                      <div className="flex h-[180px] items-center justify-center">
                        <Video className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-white">{item.label}</h3>
                    <p className="mt-2 text-sm text-slate-400">{item.variant === "long" ? "Long-form output" : "Short-form output"}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
                      <ExternalLink className="h-4 w-4" />
                      <span>Open raw file</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No preview assets exist yet. Start the automation pipeline to generate media.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Publishing Status"
        description="Tracks upload URLs and current pipeline output state."
        actions={
          <button type="button" onClick={runNow} disabled={Boolean(status?.running) || actionState.run} className="action-gradient">
            <Rocket className="h-4 w-4" />
            <span>Start pipeline</span>
          </button>
        }
      >
        <div className="space-y-4">
          <MetaRow label="Status" value={status?.statusLabel || "Idle"} />
          <MetaRow label="Current stage" value={status?.progressLabel || "Waiting"} />
          <MetaRow label="Thumbnail text" value={status?.thumbnailText || "Not available"} />
          <MetaRow label="Last topic" value={status?.selectedTopic || "No topic selected"} />
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">YouTube Links</p>
            <div className="mt-3 space-y-3">
              {uploadItems.length ? (
                uploadItems.map((item, index) => (
                  <a
                    key={`${item.url}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-200 hover:border-cyan-400/25"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-4 w-4 text-cyan-300" />
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-400">Uploads will appear here after the pipeline finishes and publishing succeeds.</p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
