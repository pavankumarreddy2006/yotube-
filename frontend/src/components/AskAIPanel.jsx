import { Sparkles, Video } from "lucide-react";
import { useState } from "react";
import Card from "./Card";

export default function AskAIPanel({ onGenerate, loading, result, language }) {
  const [topic, setTopic] = useState("");
  const [generateVideo, setGenerateVideo] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!topic.trim()) {
      return;
    }
    await onGenerate({ topic, generate_video: generateVideo });
  }

  return (
    <Card title="Ask AI" subtitle="Generate a sports script on demand in the selected dashboard language.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Ask sports topic..."
          className="min-h-[120px] w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-accent"
        />

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={generateVideo}
            onChange={(event) => setGenerateVideo(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
          />
          Include optional video generation prompt
        </label>

        <button type="submit" disabled={loading} className="action-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
          <Sparkles className="h-4 w-4" />
          {loading ? "Generating..." : `Generate Script (${language === "en" ? "English" : "Telugu"})`}
        </button>
      </form>

      {result ? (
        <div className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="subtle">Generated Title</p>
            <p className="mt-2 font-medium text-white">{result.title}</p>
          </div>
          <div>
            <p className="subtle">Script</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-200">{result.script}</p>
          </div>
          {result.video_prompt ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-highlight">
                <Video className="h-4 w-4" />
                Video Prompt
              </div>
              <p className="text-sm leading-6 text-slate-200">{result.video_prompt}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
