import { ExternalLink, FileImage, ImageIcon, MonitorPlay } from "lucide-react";
import { SectionCard } from "../components/SectionCard";

export default function AssetsPage({ dashboard }) {
  const { status } = dashboard;
  const previewItems = status?.previewItems || [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard
        title="Media Assets"
        description="Central view for thumbnails, preview renders, and visual generation outputs."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AssetCard
            title="Thumbnail Preview"
            description={status?.thumbnailText || "Thumbnail copy and generated artwork will appear here after a run."}
            media={
              status?.thumbnailUrl ? (
                <img src={status.thumbnailUrl} alt="Generated thumbnail" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-slate-500" />
                </div>
              )
            }
          />
          <AssetCard
            title="Latest Preview Asset"
            description={previewItems[0]?.label || "No rendered media is available yet."}
            media={
              previewItems[0]?.url ? (
                <video src={previewItems[0].url} controls preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <MonitorPlay className="h-8 w-8 text-slate-500" />
                </div>
              )
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Asset Inventory"
        description="Quick references to the latest media produced by the automation flow."
      >
        <div className="space-y-4">
          <InventoryRow label="Thumbnail status" value={status?.thumbnailUrl ? "Ready" : "Pending"} />
          <InventoryRow label="Rendered previews" value={String(previewItems.length)} />
          <InventoryRow label="Current topic" value={status?.selectedTopic || "No topic selected"} />
          <InventoryRow label="Last update" value={status?.lastRunTimeLabel || "No recent run"} />
          <div className="section-surface">
            <p className="text-sm font-medium text-white">Preview assets</p>
            <div className="mt-3 space-y-3">
              {previewItems.length ? (
                previewItems.map((item, index) => (
                  <a
                    key={`${item.url}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/25"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="h-4 w-4 text-cyan-300" />
                      <span>{item.label}</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-cyan-300" />
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-400">Assets will appear here after the next successful automation run.</p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function AssetCard({ title, description, media }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/50 aspect-video">
        {media}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function InventoryRow({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
