import { ImageIcon } from "lucide-react";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function ThumbnailPanel({ thumbnailUrl, thumbnailText, contentThumbnailText }) {
  const text = thumbnailText || contentThumbnailText || "Thumbnail text unavailable";

  return (
    <Card title="Thumbnail Preview" subtitle="Latest generated cover art and headline treatment.">
      {thumbnailUrl ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            <img src={thumbnailUrl} alt={text} className="h-52 w-full object-cover sm:h-60" />
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
            <p className="subtle">Thumbnail Text</p>
            <p className="mt-2 text-lg font-semibold text-white">{text}</p>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ImageIcon}
          title="Thumbnail preview unavailable"
          description="The backend has not exposed a thumbnail URL yet. The text panel still updates when content is available."
          footer={<p className="text-sm text-slate-300">{text}</p>}
        />
      )}
    </Card>
  );
}
