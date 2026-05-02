import { Clipboard, FileText } from "lucide-react";
import { useState } from "react";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

export default function ContentPanel({ content }) {
  const [copiedKey, setCopiedKey] = useState("");

  function handleCopy(key, value) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1500);
  }

  if (!content) {
    return (
      <Card title="Content Panel" subtitle="Generated Telugu scripts for Shorts and long-form.">
        <EmptyState icon={FileText} title="Scripts unavailable" description="No content payload has been generated yet." />
      </Card>
    );
  }

  const scriptBlocks = [
    {
      key: "shorts",
      title: "Shorts Script",
      value: content.shortsScript,
      fallback: "Shorts script is not available in the latest response."
    },
    {
      key: "long",
      title: "Long Video Script",
      value: content.longScript,
      fallback: "Long script is empty because the bot selected Shorts-only output or generation has not finished."
    }
  ];

  return (
    <Card title="Content Panel" subtitle="Ready-to-speak Telugu content with one-tap copy.">
      <div className="space-y-4">
        {content.title ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="subtle">Generated Title</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{content.title}</h3>
          </div>
        ) : null}

        {scriptBlocks.map((block) => (
          <section key={block.key} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-white">{block.title}</h3>
              <button
                type="button"
                onClick={() => handleCopy(block.key, block.value || block.fallback)}
                className="action-btn-secondary"
              >
                <Clipboard className="h-4 w-4" />
                {copiedKey === block.key ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-200">
              {block.value || block.fallback}
            </p>
          </section>
        ))}
      </div>
    </Card>
  );
}
