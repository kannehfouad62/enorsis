type DecisionInsight = {
  id: string;
  type: string;
  severity: string;
  title: string;
  executiveSummary: string;
  recommendation: string | null;
  confidenceScore: { toString(): string };
  requiresHumanReview: boolean;
  domain: string;
  priorityScore: number;
  evidence: Array<{
    id: string;
    label: string;
    observedValue: string | null;
    expectedValue: string | null;
  }>;
};

export function ExecutiveDecisionCard({
  insight,
}: {
  insight: DecisionInsight;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            {insight.type} · {insight.domain} · {insight.severity}
          </p>
          <h3 className="mt-2 text-xl font-black">{insight.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {insight.executiveSummary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase text-slate-500">Priority</p>
            <p className="mt-1 text-xl font-black">{insight.priorityScore}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] uppercase text-slate-500">Confidence</p>
            <p className="mt-1 text-xl font-black">
              {insight.confidenceScore.toString()}%
            </p>
          </div>
        </div>
      </div>

      {insight.requiresHumanReview ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Human review required before this recommendation is treated as an
          executive decision.
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase text-slate-500">
          Recommended executive action
        </p>
        <p className="mt-2 text-sm leading-6">
          {insight.recommendation ?? "No recommendation generated."}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {insight.evidence.slice(0, 4).map((evidence) => (
          <div key={evidence.id} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-black">{evidence.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              Observed {evidence.observedValue ?? "—"} · Expected{" "}
              {evidence.expectedValue ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
