import Link from "next/link";
import { ExecutiveDecisionCard } from "@/components/executive-ai/decision-card";
import { getExecutiveDecisionBriefingWorkspace } from "@/modules/governed-executive-ai/briefing-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ExecutiveAiBriefingPage() {
  const data = await getExecutiveDecisionBriefingWorkspace();

  const stats = [
    ["Decision items", data.executiveSummary.decisionItems],
    ["Critical insights", data.executiveSummary.criticalInsights],
    ["Human review", data.executiveSummary.humanReviewRequired],
    ["Opportunities", data.executiveSummary.opportunities],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.5.3
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Executive AI Decision Briefing
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Prioritized executive decisions, risks, opportunities and
            evidence-backed recommendations derived from governed Enorsis
            intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/executive/ai-intelligence"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Governed AI Intelligence
          </Link>
          <Link
            href="/app/executive"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            Executive Workspace
          </Link>
          <Link
            href="/app/executive/ai-governance"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            AI Governance
          </Link>
          <Link
            href="/app/executive/ai-synthesis"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            OpenAI Synthesis
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-black">Executive decision queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Highest-priority insights requiring leadership attention.
          </p>
        </div>

        <div className="space-y-5">
          {data.decisionQueue.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-500">
                No high-priority executive decisions are currently queued.
              </p>
            </div>
          ) : (
            data.decisionQueue.map((insight) => (
              <ExecutiveDecisionCard key={insight.id} insight={insight} />
            ))
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Top risks</h2>
          <div className="mt-5 space-y-3">
            {data.topRisks.map((insight) => (
              <article key={insight.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-red-700">
                  {insight.severity} · {insight.domain}
                </p>
                <p className="mt-1 font-black">{insight.title}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {insight.executiveSummary}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Top opportunities</h2>
          <div className="mt-5 space-y-3">
            {data.topOpportunities.map((insight) => (
              <article key={insight.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-emerald-700">
                  {insight.domain}
                </p>
                <p className="mt-1 font-black">{insight.title}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {insight.executiveSummary}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Insight concentration by domain</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.topDomains.map((item) => (
            <article key={item.domain} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">{item.domain}</p>
              <p className="mt-2 text-3xl font-black">{item.count}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
