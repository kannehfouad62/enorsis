import Link from "next/link";
import {
  publishSupplierScorecardAction,
  submitSupplierScorecardAction,
} from "@/modules/supplier-performance/actions";
import { getSupplierScorecardDetail } from "@/modules/supplier-performance/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierScorecardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { scorecard } = await getSupplierScorecardDetail(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/suppliers/performance" className="font-black text-blue-700">
        ← Supplier performance
      </Link>
      <h1 className="mt-5 text-4xl font-black">
        {scorecard.supplier.tradingName ?? scorecard.supplier.legalName}
      </h1>
      <p className="mt-2 text-slate-600">
        {scorecard.rating} · {scorecard.overallScore.toString()} · {scorecard.status}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {scorecard.kpis.map((kpi) => (
          <article key={kpi.id} className={card}>
            <p className="text-xs font-black text-blue-700">{kpi.category}</p>
            <h2 className="mt-2 font-black">{kpi.name}</h2>
            <p className="mt-3 text-3xl font-black">{kpi.score.toString()}</p>
            <p className="mt-1 text-xs text-slate-500">Weight {kpi.weight.toString()}%</p>
          </article>
        ))}
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Executive assessment</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {scorecard.executiveSummary ?? "No executive summary recorded."}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-black">Strengths</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {scorecard.strengths ?? "None recorded."}
            </p>
          </div>
          <div>
            <h3 className="font-black">Concerns</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {scorecard.concerns ?? "None recorded."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {scorecard.status === "DRAFT" ? (
            <form action={submitSupplierScorecardAction}>
              <input type="hidden" name="scorecardId" value={scorecard.id} />
              <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
                Submit for review
              </button>
            </form>
          ) : null}
          {scorecard.status === "IN_REVIEW" ? (
            <form action={publishSupplierScorecardAction}>
              <input type="hidden" name="scorecardId" value={scorecard.id} />
              <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
                Publish scorecard
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <h2 className="text-xl font-black">Recent risk assessments</h2>
          <div className="mt-4 space-y-3">
            {scorecard.supplier.riskAssessments.map((assessment) => (
              <article key={assessment.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">{assessment.status}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Residual risk {assessment.residualRiskScore}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Open risk findings</h2>
          <div className="mt-4 space-y-3">
            {scorecard.supplier.riskFindings.map((finding) => (
              <article key={finding.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">{finding.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Severity {finding.severity} · {finding.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Recent ESG assessments</h2>
          <div className="mt-4 space-y-3">
            {scorecard.supplier.esgAssessments.map((assessment) => (
              <article key={assessment.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">{assessment.rating}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Overall score {assessment.overallScore}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
