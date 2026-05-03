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
        <div className="panel-grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="panel-grid">
            <StatusPanel status={status} />
            <div className="panel-grid xl:grid-cols-[1.06fr_0.94fr]">
              <NewsPanel news={news} />
              <DecisionPanel decision={decision} />
            </div>
            <ContentPanel content={content} />
            <LogsPanel logs={logs} />
          </div>

          <div className="panel-grid">
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
            <AskAIPanel onGenerate={askAi} loading={actionState.askAi} result={askAiResult} language={language} />
            <ThumbnailPanel
              thumbnailUrl={status?.thumbnailUrl}
              thumbnailText={status?.thumbnailText}
              contentThumbnailText={content?.thumbnailText}
            />
            <VideoPreviewPanel previewItems={status?.previewItems || content?.previewItems} youtubeLinks={status?.youtubeLinks} />
            <NotificationPanel notifications={status?.notifications} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
