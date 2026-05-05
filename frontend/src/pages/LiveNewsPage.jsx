import { RefreshCw } from "lucide-react";
import { NewsList } from "../components/NewsList";
import { SectionCard } from "../components/SectionCard";

export default function LiveNewsPage({ dashboard }) {
  const { news, loading, refreshNews, refreshState } = dashboard;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Live News"
        description="Dynamic sports headlines sourced from the backend news feed, tuned for fast topic selection."
        actions={
          <button type="button" onClick={refreshNews} disabled={refreshState.news} className="ghost-button">
            <RefreshCw className={`h-4 w-4 ${refreshState.news ? "animate-spin" : ""}`} />
            <span>Refresh news</span>
          </button>
        }
      >
        <div className="soft-panel mb-5">
          <p className="text-sm font-medium text-white">What converts well</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Prioritize stories with strong public interest, clear visuals, and easy Telugu explanations. These usually perform better in both full videos and Shorts.
          </p>
        </div>
        <NewsList items={news} loading={loading.news && !news.length} />
      </SectionCard>
    </div>
  );
}
