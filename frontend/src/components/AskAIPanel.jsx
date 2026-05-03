import { Check, Clipboard, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import Card from "./Card";

export default function AskAIPanel({ onGenerate, loading, result, language }) {
  const [topic, setTopic] = useState("");
  const [generateVideo, setGenerateVideo] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!topic.trim()) {
      return;
    }
    await onGenerate({ topic, generate_video: generateVideo });
  }

  async function handleCopy() {
    const text = [result?.title, result?.script, result?.video_prompt].filter(Boolean).join("\n\n");
    if (!text) {
      return;
    }
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <Card
      title="Ask AI"
      subtitle="Chat-style script generation for breaking sports stories, shorts, and video prompts."
      className="h-full"
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Prompt</p>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ask about sports news..."
              className="mt-3 min-h-[180px] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <Video className="h-4 w-4 text-cyan-300" />
              Include video creation prompt
            </span>
            <input
              type="checkbox"
              checked={generateVideo}
              onChange={(event) => setGenerateVideo(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-cyan-400"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="hero-cta w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Sparkles className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Generating script..." : `Generate Script (${language === "en" ? "English" : "Telugu"})`}</span>
          </button>
        </form>

        <div className="flex min-h-[320px] flex-col rounded-[30px] border border-white/10 bg-slate-950/35 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">AI Output</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-white">Generated Script</h3>
            </div>
            <button type="button" onClick={handleCopy} className="action-btn-secondary" disabled={!result}>
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {result ? (
            <div className="custom-scroll space-y-4 overflow-y-auto pr-1">
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Title</p>
                <p className="mt-2 text-base font-medium text-white">{result.title}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Script</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-200">{result.script}</p>
              </div>
              {result.video_prompt ? (
                <div className="rounded-2xl border border-violet-300/15 bg-violet-400/8 p-4">
                  <div className="flex items-center gap-2 text-sm text-violet-200">
                    <Video className="h-4 w-4" />
                    <span>Create Video Prompt</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{result.video_prompt}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="font-display text-lg font-semibold text-white">No script generated yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Ask about a sports story and the AI will draft a polished script response here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
