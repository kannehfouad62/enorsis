import Link from "next/link";
import {
  createSupplierCorrectiveActionAction,
  createSupplierDevelopmentPlanAction,
  createSupplierScorecardAction,
  updateSupplierCorrectiveActionAction,
} from "@/modules/supplier-performance/actions";
import { getSupplierPerformanceWorkspace } from "@/modules/supplier-performance/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierPerformancePage() {
  const data = await getSupplierPerformanceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supplier performance management
      </p>
      <h1 className="mt-3 text-4xl font-black">Supplier Performance</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern scorecards, development plans and supplier corrective actions
        using delivery, quality, cost, ESG, risk and compliance evidence.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Published scorecards" value={data.metrics.publishedScorecards} />
        <Metric label="Average score" value={data.metrics.averageScore} />
        <Metric label="Critical suppliers" value={data.metrics.criticalSuppliers} />
        <Metric label="Open SCARs" value={data.metrics.openScars} />
        <Metric label="Overdue SCARs" value={data.metrics.overdueScars} />
        <Metric label="Active plans" value={data.metrics.activePlans} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create supplier scorecard</h2>
        <form action={createSupplierScorecardAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName}
              </option>
            ))}
          </select>
          <input className={input} name="periodStart" type="date" required />
          <input className={input} name="periodEnd" type="date" required />
          {[
            ["deliveryScore", "Delivery"],
            ["qualityScore", "Quality"],
            ["costScore", "Cost"],
            ["serviceScore", "Service"],
            ["innovationScore", "Innovation"],
            ["esgScore", "ESG"],
            ["riskScore", "Risk"],
            ["complianceScore", "Compliance"],
          ].map(([name, label]) => (
            <input
              key={name}
              className={input}
              name={name}
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder={`${label} score`}
              required
            />
          ))}
          <textarea className={`${input} min-h-24 md:col-span-2`} name="executiveSummary" placeholder="Executive summary" />
          <textarea className={`${input} min-h-24`} name="strengths" placeholder="Strengths" />
          <textarea className={`${input} min-h-24`} name="concerns" placeholder="Concerns" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create scorecard
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create development plan</h2>
          <form action={createSupplierDevelopmentPlanAction} className="mt-5 grid gap-3">
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="title" placeholder="Plan title" required />
            <textarea className={`${input} min-h-24`} name="objective" placeholder="Objective" required />
            <input className={input} name="supplierOwnerName" placeholder="Supplier owner" />
            <input className={input} name="startsAt" type="date" required />
            <input className={input} name="targetCompletionAt" type="date" required />
            <textarea className={`${input} min-h-20`} name="successMeasures" placeholder="Success measures" required />
            <textarea className={`${input} min-h-28`} name="actions" placeholder="One action per line" required />
            <input className={input} name="reviewCadence" placeholder="Monthly, quarterly..." />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Create development plan
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Open supplier corrective action</h2>
          <form action={createSupplierCorrectiveActionAction} className="mt-5 grid gap-3">
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="title" placeholder="SCAR title" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Nonconformance description" required />
            <select className={input} name="severity" defaultValue="MODERATE">
              <option>LOW</option>
              <option>MODERATE</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
            <input className={input} name="sourceType" placeholder="Source type" />
            <input className={input} name="sourceId" placeholder="Source record ID" />
            <input className={input} name="supplierContactName" placeholder="Supplier contact" />
            <input className={input} name="supplierContactEmail" type="email" placeholder="Supplier email" />
            <textarea className={`${input} min-h-20`} name="containmentAction" placeholder="Immediate containment" />
            <input className={input} name="dueAt" type="date" required />
            <button className="rounded-xl bg-red-700 px-5 py-3 font-black text-white">
              Open SCAR
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Scorecards</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Supplier</th>
              <th className="p-3">Period</th>
              <th className="p-3">Score</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.scorecards.map((scorecard) => (
              <tr key={scorecard.id} className="border-t border-slate-100">
                <td className="p-3 font-black">
                  {scorecard.supplier.tradingName ?? scorecard.supplier.legalName}
                </td>
                <td className="p-3">
                  {scorecard.periodStart.toLocaleDateString()} – {scorecard.periodEnd.toLocaleDateString()}
                </td>
                <td className="p-3">{scorecard.overallScore.toString()}</td>
                <td className="p-3">{scorecard.rating}</td>
                <td className="p-3">{scorecard.status}</td>
                <td className="p-3">
                  <Link className="font-black text-blue-700" href={`/app/suppliers/performance/${scorecard.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Corrective actions</h2>
        <div className="mt-5 space-y-4">
          {data.correctiveActions.map((scar) => (
            <article key={scar.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-red-700">
                {scar.scarNumber} · {scar.severity} · {scar.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{scar.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {scar.supplier.tradingName ?? scar.supplier.legalName} · Due {scar.dueAt.toLocaleDateString()}
              </p>
              <form action={updateSupplierCorrectiveActionAction} className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="scarId" value={scar.id} />
                <select className={input} name="status" defaultValue={scar.status}>
                  <option>OPEN</option>
                  <option>SUPPLIER_RESPONSE_REQUIRED</option>
                  <option>UNDER_REVIEW</option>
                  <option>IMPLEMENTATION</option>
                  <option>VERIFICATION</option>
                  <option>CLOSED</option>
                  <option>REJECTED</option>
                </select>
                <input className={input} name="rootCause" placeholder="Root cause" />
                <textarea className={`${input} min-h-20`} name="correctiveActionPlan" placeholder="Corrective action plan" />
                <textarea className={`${input} min-h-20`} name="preventiveAction" placeholder="Preventive action" />
                <textarea className={`${input} min-h-20 md:col-span-2`} name="verificationNotes" placeholder="Verification notes" />
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                  Update SCAR
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
