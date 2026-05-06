import { Copy, LoaderCircle, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "../components/SectionCard";

export default function ScriptGeneratorPage({ dashboard }) {
  const { askAi, askAiResult, actionState, error, status, language } = dashboard;
  const [topic, setTopic] = useState(status?.selectedTopic || "");
  const [copied, setCopied] = useState(false);
  const loading = actionState.prompt;

  async function submit(generateVideo) {
    if (!topic.trim()) {
      return;
    }
    await askAi({ topic, generate_video: generateVideo });
  }

  async function copyResult() {
    const text = [askAiResult?.title, askAiResult?.script, askAiResult?.video_prompt].filter(Boolean).join("\n\n");
    if (!text || !navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard title="Script Request" description="Send a custom sports topic to the backend `/ask` endpoint.">
        <label className="text-sm text-slate-300">Topic</label>
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="input-surface mt-3 min-h-[180px] w-full resize-none"
          placeholder="Enter a sports topic, match, player, transfer, or tournament story."
        />
        <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Selected language: <span className="font-medium text-white">{language === "en" ? "English" : "Telugu"}</span>
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => submit(false)} disabled={loading} className="action-gradient">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Generate Script</span>
          </button>
          <button type="button" onClick={() => submit(true)} disabled={loading} className="ghost-button">
            <Video className="h-4 w-4" />
            <span>Generate Script + Video Prompt</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Generated Output"
        description="Structured response returned from the backend generator."
        actions={
          <button type="button" onClick={copyResult} disabled={!askAiResult?.script} className="ghost-button">
            <Copy className="h-4 w-4" />
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        }
      >
        <div className="space-y-4">
          <ResultBlock label="Title" value={askAiResult?.title || "No custom script has been generated yet."} />
          <ResultBlock label="Hook" value={askAiResult?.hook || "The opening hook will appear here."} multiline />
          <ResultBlock label="Script" value={askAiResult?.script || "The generated script will appear here."} multiline />
          <ListBlock label="Research Angles" items={askAiResult?.research} empty="Verified story angles and audience psychology notes will appear here." />
          <SceneBlock label="Scene Breakdown" items={askAiResult?.scene_breakdown} />
          <SubtitleBlock label="Subtitle Timing" items={askAiResult?.subtitle_timing} />
          <ThumbnailBlock label="Thumbnail Strategy" value={askAiResult?.thumbnail_strategy} />
          <ListBlock label="Title Options" items={askAiResult?.title_options} empty="Extra CTR-focused title ideas will appear here." />
          <ResultBlock label="Viral Angle" value={askAiResult?.viral_angle || "The audience and virality angle will appear here."} multiline />
          <ScoreBlock engagement={askAiResult?.engagement_score} retention={askAiResult?.retention_score} />
          <ResultBlock label="Video Prompt" value={askAiResult?.video_prompt || "Request video prompt generation to see a production brief here."} multiline />
          <ResultBlock
            label="Language"
            value={askAiResult?.language_label || status?.languageLabel || (language === "en" ? "English" : "Telugu")}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function ResultBlock({ label, value, multiline = false }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 text-sm text-slate-200 ${multiline ? "whitespace-pre-line leading-7" : ""}`}>{value}</p>
    </div>
  );
}

function ListBlock({ label, items, empty }) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.map((item, index) => (
            <p key={`${label}-${index}`} className="text-sm leading-7 text-slate-200">
              {index + 1}. {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-200">{empty}</p>
      )}
    </div>
  );
}

function SceneBlock({ label, items }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {rows.length ? (
        <div className="mt-3 space-y-3">
          {rows.map((item, index) => (
            <div key={`scene-${index}`} className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-slate-200">
              <p className="font-medium text-white">Scene {item.scene_number || index + 1}</p>
              <p className="mt-2 leading-6">{item.narration}</p>
              <p className="mt-2 text-slate-300">Visual: {item.visual}</p>
              <p className="mt-1 text-slate-400">Transition: {item.transition} | Motion: {item.motion} | Emotion: {item.emotion} | {item.duration_seconds}s</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-200">Scene-by-scene editing guidance will appear here.</p>
      )}
    </div>
  );
}

function SubtitleBlock({ label, items }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.map((item, index) => (
            <p key={`subtitle-${index}`} className="text-sm leading-7 text-slate-200">
              {item.start}s - {item.end}s: {item.text} [{item.emphasis}]
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-200">Subtitle sync suggestions will appear here.</p>
      )}
    </div>
  );
}

function ThumbnailBlock({ label, value }) {
  const strategy = value && typeof value === "object" ? value : null;
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {strategy ? (
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          <p>Text: {strategy.text}</p>
          <p>Layout: {strategy.layout}</p>
          <p>Focal subject: {strategy.focal_subject}</p>
          <p>Color strategy: {strategy.color_strategy}</p>
          <p>Emotion: {strategy.emotion}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-200">Thumbnail composition strategy will appear here.</p>
      )}
    </div>
  );
}

function ScoreBlock({ engagement, retention }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Performance Forecast</p>
      <p className="mt-3 text-sm text-slate-200">Engagement score: {engagement ?? "Pending"} / 100</p>
      <p className="mt-1 text-sm text-slate-200">Retention score: {retention ?? "Pending"} / 100</p>
    </div>
  );
}
