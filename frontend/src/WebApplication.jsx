import AskAIPanel from "./components/AskAIPanel";
import ContentPanel from "./components/ContentPanel";
import ControlPanel from "./components/ControlPanel";
import DashboardShell from "./components/DashboardShell";
import DecisionPanel from "./components/DecisionPanel";
import ErrorBanner from "./components/ErrorBanner";
import Header from "./components/Header";
import LoadingScreen from "./components/LoadingScreen";
import LogsPanel from "./components/LogsPanel";
import NewsPanel from "./components/NewsPanel";
import NotificationPanel from "./components/NotificationPanel";
import StatusPanel from "./components/StatusPanel";
import ThumbnailPanel from "./components/ThumbnailPanel";
import VideoPreviewPanel from "./components/VideoPreviewPanel";
import { useDashboardData } from "./hooks/useDashboardData";

export default function App() {
  const {
    config,
    status,
    news,
    decision,
    content,
    logs,
    loading,
    refreshing,
    error,
    language,
    setLanguage,
    actionState,
    askAiResult,
    liveRefresh,
    setLiveRefresh,
    refreshNow,
    runNow,
    retryNow,
    uploadNow,
    askAi
  } = useDashboardData();

  return (
    <DashboardShell>
      <Header
        status={status}
        refreshing={refreshing}
        liveRefresh={liveRefresh}
        setLiveRefresh={setLiveRefresh}
        onRefresh={refreshNow}
        config={config}
      />
      <ErrorBanner message={error} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <div className="dashboard-flow">
          <ControlPanel
            onRun={runNow}
            onRetry={retryNow}
            onUpload={uploadNow}
            actionState={actionState}
            status={status}
            language={language}
            setLanguage={setLanguage}
            languages={config?.languages || []}
          />

          <StatusPanel status={status} />

          <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
            <NewsPanel news={news} />
            <DecisionPanel decision={decision} />
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
            <AskAIPanel onGenerate={askAi} loading={actionState.askAi} result={askAiResult} language={language} />
            <ContentPanel content={content} />
          </div>

          <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
            <ThumbnailPanel
              thumbnailUrl={status?.thumbnailUrl}
              thumbnailText={status?.thumbnailText}
              contentThumbnailText={content?.thumbnailText}
            />
            <VideoPreviewPanel
              previewItems={status?.previewItems || content?.previewItems}
              youtubeLinks={status?.youtubeLinks}
            />
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.12fr_0.88fr]">
            <LogsPanel logs={logs} />
            <NotificationPanel notifications={status?.notifications} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
