import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  ShieldCheck,
  Target,
} from "lucide-react";
import { runAiSupplierMatchAction } from "@/modules/marketplace-matching/actions";
import { getSupplierMatchingWorkspace } from "@/modules/marketplace-matching/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierMatchingPage() {
  const data = await getSupplierMatchingWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B7.4 · Procurement Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed AI Supplier Matching
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Rank marketplace suppliers using deterministic,
            explainable evidence first, then use Enorsis governed AI
            to summarize strengths, gaps and due diligence needs.
            Supplier selection remains a human decision.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/marketplace/trust"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Trust Network
          </Link>
          <Link
            href="/app/marketplace/suppliers"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Supplier Discovery
          </Link>
        </div>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Create supplier match
          </h2>
        </div>

        <form
          action={runAiSupplierMatchAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <input
            className={input}
            name="title"
            placeholder="Match title"
          />
          <input
            className={input}
            name="category"
            placeholder="Procurement category"
          />
          <input
            className={input}
            name="country"
            placeholder="Required country / region"
          />
          <input
            className={input}
            name="preferredCurrency"
            placeholder="Preferred currency"
            defaultValue="USD"
            maxLength={3}
          />
          <input
            className={input}
            name="requiredCapabilities"
            placeholder="Capabilities, comma separated"
          />
          <input
            className={input}
            name="requiredCertifications"
            placeholder="Certifications, comma separated"
          />
          <input
            className={input}
            name="maxLeadTimeDays"
            type="number"
            min="0"
            placeholder="Maximum lead time days"
          />
          <select
            className={input}
            name="verificationRequired"
            defaultValue="false"
          >
            <option value="false">
              Verification preferred
            </option>
            <option value="true">
              Verification required
            </option>
          </select>
          <textarea
            className={`${input} min-h-36 md:col-span-2`}
            name="requirementText"
            placeholder="Describe the sourcing requirement, scope, commercial constraints, technical needs, service levels and any mandatory conditions."
            required
          />
          <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white md:col-span-2">
            Rank suppliers & run governed AI analysis
          </button>
        </form>
      </section>

      {data.latestRun ? (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <Metric
              label="Candidates ranked"
              value={data.latestRun.candidateCount}
            />
            <Metric
              label="Verification"
              value={
                data.latestRun.verificationRequired
                  ? "Required"
                  : "Preferred"
              }
            />
            <Metric
              label="AI analysis"
              value={
                data.latestRun.aiSummary
                  ? "Completed"
                  : data.latestRun.aiError
                    ? "Unavailable"
                    : "Not run"
              }
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-blue-700" />
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Latest deterministic match
                </p>
                <h2 className="text-xl font-black">
                  {data.latestRun.title}
                </h2>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Capability</th>
                    <th className="px-4 py-3">Geography</th>
                    <th className="px-4 py-3">Trust</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Catalog</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.latestResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3 font-black">
                        #{result.rank}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black">
                          {result.supplier?.tradingName ??
                            result.supplier?.legalName ??
                            result.supplierId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.supplier?.supplierNumber ??
                            ""}
                        </p>
                      </td>
                      <Score value={result.totalScore} />
                      <Score value={result.capabilityScore} />
                      <Score value={result.geographyScore} />
                      <Score value={result.trustScore} />
                      <Score value={result.performanceScore} />
                      <Score value={result.riskScore} />
                      <Score value={result.catalogScore} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Governed AI supplier analysis
              </h2>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-5">
              {data.latestRun.aiSummary ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {data.latestRun.aiSummary}
                </p>
              ) : data.latestRun.aiError ? (
                <p className="text-sm text-rose-700">
                  Deterministic ranking completed successfully,
                  but AI analysis was unavailable:{" "}
                  {data.latestRun.aiError}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  No AI analysis was generated for this run.
                </p>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The numeric ranking is generated from recorded
                marketplace evidence. AI may explain the evidence
                but cannot change the ranking or approve a supplier.
                Human sourcing governance remains mandatory.
              </p>
            </div>
          </section>
        </>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Recent match runs
        </h2>
        <div className="mt-4 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-black">{run.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.category ?? "Any category"} ·{" "}
                    {run.country ?? "Any geography"}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{run.candidateCount} candidates</p>
                  <p>{run.createdAt.toLocaleString()}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Score({
  value,
}: {
  value: unknown;
}) {
  return (
    <td className="px-4 py-3 font-bold">
      {Number(value).toFixed(1)}
    </td>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}
