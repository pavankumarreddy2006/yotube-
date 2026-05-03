import { Flame, Newspaper, TrendingUp } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function NewsPanel({ news }) {
  return (
    <Card title="Live Sports News" subtitle="Latest sports stories powering the automation engine." className="h-full">
      {news.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No news available"
          description="The pipeline has not fetched headlines yet, or the latest run used fallback coverage."
        />
      ) : (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {news.map((item) => (
            <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{item.category}</span>
                  <span>{item.source}</span>
                </div>
                {item.trending ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2.5 py-1 text-xs text-highlight">
                    <Flame className="h-3.5 w-3.5" />
                    Trending
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold leading-6 text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>{item.topic || item.category}</span>
                <span>{formatTimestamp(item.publishedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
