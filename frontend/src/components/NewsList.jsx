import { Newspaper } from "lucide-react";

export function NewsList({ items, loading, compact = false }) {
  const placeholderCount = compact ? 3 : 6;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="h-5 w-3/4 rounded bg-white/10" />
            <div className="mt-3 h-4 w-full rounded bg-white/10" />
            <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <div className="empty-state">No live sports stories are available yet.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="news-item">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-24 w-32 rounded-2xl object-cover" />
          ) : (
            <div className="news-image-fallback">
              <Newspaper className="h-6 w-6 text-cyan-200" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                {item.category}
              </span>
              <span className="text-slate-500">{item.source}</span>
              {item.publishedAt ? <span className="text-slate-500">{item.publishedAt}</span> : null}
            </div>
            <h3 className="mt-3 text-lg font-medium text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
