import { Flame, Newspaper, RefreshCw, TrendingUp } from "lucide-react";
import { formatTimestamp } from "../lib/formatters";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function NewsPanel({ news, refreshing }) {
  return (
    <Card
      title="Live Sports News"
      subtitle="Auto-refreshing sports headlines for script and video generation."
      action={
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Every 15 min
        </div>
      }
      className="h-full"
    >
      {news.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <div className="h-36 rounded-2xl bg-white/10" />
              <div className="mt-4 h-4 w-24 rounded-full bg-white/10" />
              <div className="mt-3 h-5 w-4/5 rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-full rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-2/3 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="custom-scroll grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {news.map((item, index) => (
            <article
              key={item.id}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-[0_18px_45px_rgba(8,47,73,0.35)]"
            >
              <div className="relative overflow-hidden rounded-[22px] border border-white/10">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-40 w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.9),rgba(45,212,191,0.75),rgba(99,102,241,0.78))] text-slate-950">
                    <div className="text-center">
                      <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                        <Newspaper className="h-5 w-5" />
                      </div>
                      <p className="text-xs uppercase tracking-[0.32em]">Story {index + 1}</p>
                    </div>
                  </div>
                )}
                <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/65 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200 backdrop-blur">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {item.category}
                </div>
                {item.trending ? (
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-950">
                    <Flame className="h-3.5 w-3.5" />
                    Trending
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <h3 className="text-base font-semibold leading-7 text-white">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{item.summary}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <span>{item.source}</span>
                <span>{formatTimestamp(item.publishedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {news.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Newspaper}
            title="No news available"
            description="The platform will populate this feed as soon as live sports headlines arrive."
          />
        </div>
      ) : null}
    </Card>
  );
}
