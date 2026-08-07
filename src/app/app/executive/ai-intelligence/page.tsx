import {
  acknowledgeGovernedExecutiveInsightAction,
  dismissGovernedExecutiveInsightAction,
  recordGovernedExecutiveInsightFeedbackAction,
  runGovernedExecutiveInsightEngineAction,
} from "@/modules/governed-executive-ai/actions";
import { CrossDomainInsightActions } from "./cross-domain-actions";
import { getGovernedExecutiveAiWorkspace } from "@/modules/governed-executive-ai/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function GovernedExecutiveAiPage() {
  const data = await getGovernedExecutiveAiWorkspace();

  const critical = data.insights.filter(
    (item) => item.severity === "CRITICAL",
  ).length;
  const reviewRequired = data.insights.filter(
    (item) => item.requiresHumanReview,
  ).length;
  const opportunities = data.insights.filter(
    (item) => item.type === "OPPORTUNITY",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.5.1
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed Executive AI Intelligence
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Deterministic, explainable executive insights generated from
            governed Enorsis analytics. No external LLM is used in this phase.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <form action={runGovernedExecutiveInsightEngineAction}>
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Run insight engine
            </button>
          </form>
          <CrossDomainInsightActions />
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active insights", data.insights.length],
          ["Critical insights", critical],
          ["Human review required", reviewRequired],
          ["Opportunities", opportunities],
        ].map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 space-y-5">
        {data.insights.map((insight) => (
          <article key={insight.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {insight.type} · {insight.domain} · {insight.severity}
                </p>
                <h2 className="mt-2 text-xl font-black">{insight.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {insight.executiveSummary}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className="mt-1 text-2xl font-black">
                  {insight.confidenceScore.toString()}%
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Explanation
                </p>
                <p className="mt-2 text-sm leading-6">
                  {insight.explanation}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Recommendation
                </p>
                <p className="mt-2 text-sm leading-6">
                  {insight.recommendation ?? "No recommendation generated."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Evidence
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {insight.evidence.map((evidence) => (
                  <div key={evidence.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-black">{evidence.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Observed {evidence.observedValue ?? "—"} · Expected{" "}
                      {evidence.expectedValue ?? "—"}
                    </p>
                    {evidence.metricKey ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {evidence.metricKey}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {insight.status === "PUBLISHED" ? (
                <form action={acknowledgeGovernedExecutiveInsightAction}>
                  <input type="hidden" name="insightId" value={insight.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Acknowledge
                  </button>
                </form>
              ) : null}

              <form
                action={dismissGovernedExecutiveInsightAction}
                className="flex gap-2"
              >
                <input type="hidden" name="insightId" value={insight.id} />
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  name="reason"
                  placeholder="Dismissal reason"
                  required
                />
                <button className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-black text-white">
                  Dismiss
                </button>
              </form>

              <form
                action={recordGovernedExecutiveInsightFeedbackAction}
                className="flex gap-2"
              >
                <input type="hidden" name="insightId" value={insight.id} />
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  name="feedbackType"
                >
                  <option>USEFUL</option>
                  <option>NOT_USEFUL</option>
                  <option>INCORRECT</option>
                  <option>NEEDS_CONTEXT</option>
                </select>
                <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">
                  Submit feedback
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Insight run history</h2>
        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article key={run.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black">{run.runNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.engineVersion} · {run.scope}
                  </p>
                </div>
                <span className="text-xs font-black">{run.status}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {run.insightCount} insights · {run.warningCount} warnings ·{" "}
                {run.failureCount} failures
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
