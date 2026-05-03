import AskAIPanel from "./components/AskAIPanel";
import ControlPanel from "./components/ControlPanel";
import DashboardShell from "./components/DashboardShell";
import ErrorBanner from "./components/ErrorBanner";
import Header from "./components/Header";
import LoadingScreen from "./components/LoadingScreen";
import LogsPanel from "./components/LogsPanel";
import NewsPanel from "./components/NewsPanel";
import StatusPanel from "./components/StatusPanel";
import VideoPreviewPanel from "./components/VideoPreviewPanel";
import { useDashboardData } from "./hooks/useDashboardData";

export default function App() {
  const {
    config,
    status,
    news,
    content,
    logs,
    loading,
    refreshingStatus,
    refreshingNews,
    error,
    language,
    setLanguage,
    actionState,
    askAiResult,
    liveRefresh,
    setLiveRefresh,
    refreshNow,
    runNow,
    uploadNow,
    askAi
  } = useDashboardData();

  return (
    <DashboardShell>
      <Header
        status={status}
        refreshing={refreshingStatus}
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
            actionState={actionState}
            status={status}
            language={language}
            setLanguage={setLanguage}
            languages={config?.languages || []}
          />

          <StatusPanel status={status} />

          <div className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
            <NewsPanel news={news} refreshing={refreshingNews} />
            <AskAIPanel
              onGenerate={askAi}
              onGenerateVideo={askAi}
              loading={actionState.askAi}
              result={askAiResult}
              language={language}
            />
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
            <VideoPreviewPanel
              previewItems={status?.previewItems || content?.previewItems}
              youtubeLinks={status?.youtubeLinks}
              thumbnailUrl={status?.thumbnailUrl}
              onUpload={uploadNow}
              uploadLoading={actionState.upload}
              running={status?.running}
            />
            <LogsPanel logs={logs} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
