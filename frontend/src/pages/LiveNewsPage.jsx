import { RefreshCw } from "lucide-react";
import { NewsList } from "../components/NewsList";
import { SectionCard } from "../components/SectionCard";

export default function LiveNewsPage({ dashboard }) {
  const { news, loading, refreshNews, refreshState } = dashboard;

  return (
    <SectionCard
      title="Live News"
      description="Dynamic sports headlines sourced from the backend `/news` endpoint."
      actions={
        <button type="button" onClick={refreshNews} disabled={refreshState.news} className="ghost-button">
          <RefreshCw className={`h-4 w-4 ${refreshState.news ? "animate-spin" : ""}`} />
          <span>Refresh news</span>
        </button>
      }
    >
      <NewsList items={news} loading={loading.news && !news.length} />
    </SectionCard>
  );
}
