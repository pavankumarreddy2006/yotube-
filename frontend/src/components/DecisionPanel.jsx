import { BadgeAlert, Sparkles, Video } from "lucide-react";
import Card from "./Card";
import EmptyState from "./shared/EmptyState";

const decisionTone = {
  FULL: "from-success/20 to-accent/15 text-success ring-success/20",
  SHORT: "from-highlight/20 to-warning/10 text-highlight ring-highlight/20",
  SKIP: "from-danger/20 to-danger/10 text-danger ring-danger/20"
};

const decisionLabel = {
  FULL: "FULL VIDEO",
  SHORT: "SHORT ONLY",
  SKIP: "SKIP"
};

export default function DecisionPanel({ decision }) {
  if (!decision) {
    return (
      <Card title="Decision Panel" subtitle="Quality score and publishing action.">
        <EmptyState icon={BadgeAlert} title="Decision unavailable" description="Scoring data has not arrived yet." />
      </Card>
    );
  }

  const tone = decisionTone[decision.action] || decisionTone.SKIP;

  return (
    <Card title="Decision Panel" subtitle="Quality score and publishing action.">
      <div className={`rounded-[26px] bg-gradient-to-br p-5 ring-1 ${tone}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Decision Output
            </div>
            <h3 className="text-3xl font-semibold text-white">{decision.score}</h3>
            <p className="mt-1 text-sm text-slate-200">Selected topic: {decision.selectedTopic}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <Video className="h-4 w-4" />
              Action
            </div>
            <div className="text-xl font-semibold text-white">{decisionLabel[decision.action] || decision.action}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {decision.reasons.length > 0 ? (
          decision.reasons.map((reason) => (
            <span key={reason} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              {reason}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">No reason metadata returned by the API.</span>
        )}
      </div>
    </Card>
  );
}
