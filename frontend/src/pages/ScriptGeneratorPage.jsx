import { Copy, LoaderCircle, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "../components/SectionCard";

export default function ScriptGeneratorPage({ dashboard }) {
  const { askAi, askAiResult, actionState, error, status, language } = dashboard;
  const [topic, setTopic] = useState(status?.selectedTopic || "");
  const [copied, setCopied] = useState(false);

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
          <button type="button" onClick={() => submit(false)} disabled={actionState.askAi} className="action-gradient">
            {actionState.askAi ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Generate Script</span>
          </button>
          <button type="button" onClick={() => submit(true)} disabled={actionState.askAi} className="ghost-button">
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
          <ResultBlock label="Script" value={askAiResult?.script || "The generated script will appear here."} multiline />
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
