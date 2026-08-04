import Link from "next/link";
import {
  addSupplierRiskFindingAction,
  createSupplierEsgAssessmentAction,
  createSupplierRiskAssessmentAction,
  resolveSupplierRiskFindingAction,
} from "@/modules/supplier-risk/actions";
import { getSupplierRiskDetail } from "@/modules/supplier-risk/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function SupplierRiskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplier, members } = await getSupplierRiskDetail(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/suppliers/risk" className="font-black text-blue-700">← Risk portfolio</Link>
      <h1 className="mt-5 text-4xl font-black">{supplier.tradingName ?? supplier.legalName}</h1>
      <p className="mt-2 text-slate-600">{supplier.supplierNumber} · {supplier.riskTier} risk</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form action={createSupplierRiskAssessmentAction} className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Risk assessment</h2>
          <input type="hidden" name="supplierId" value={id} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["financialRisk", "operationalRisk", "complianceRisk", "cyberRisk", "esgRisk", "deliveryRisk", "qualityRisk", "concentrationRisk", "controlEffectiveness"].map((name) => (
              <input key={name} className={input} name={name} type="number" min="0" max="100" placeholder={name.replaceAll(/([A-Z])/g, " $1")} required />
            ))}
            <textarea className={`${input} min-h-24 md:col-span-2`} name="rationale" placeholder="Assessment rationale" required />
            <textarea className={`${input} min-h-20 md:col-span-2`} name="controls" placeholder="Existing controls" />
            <button className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Save assessment</button>
          </div>
        </form>

        <form action={createSupplierEsgAssessmentAction} className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">ESG assessment</h2>
          <input type="hidden" name="supplierId" value={id} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["environmentalScore", "socialScore", "governanceScore"].map((name) => (
              <input key={name} className={input} name={name} type="number" min="0" max="100" placeholder={name.replaceAll(/([A-Z])/g, " $1")} required />
            ))}
            {[["carbonDisclosure", "Carbon disclosure"], ["scienceBasedTargets", "Science-based targets"], ["modernSlaveryPolicy", "Modern slavery policy"], ["diversityProgram", "Diversity program"], ["ethicsPolicy", "Ethics policy"]].map(([name, label]) => (
              <label key={name} className="text-sm font-bold"><input className="mr-2" name={name} type="checkbox" />{label}</label>
            ))}
            <textarea className={`${input} min-h-24 md:col-span-2`} name="evidenceSummary" placeholder="Evidence summary" />
            <button className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white">Save ESG assessment</button>
          </div>
        </form>
      </div>

      <form action={addSupplierRiskFindingAction} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Add risk finding</h2>
        <input type="hidden" name="supplierId" value={id} />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select className={input} name="type">{["FINANCIAL", "OPERATIONAL", "COMPLIANCE", "SANCTIONS", "CYBER", "ESG", "DELIVERY", "QUALITY", "CONCENTRATION", "OTHER"].map((type) => <option key={type}>{type}</option>)}</select>
          <input className={input} name="title" placeholder="Finding title" required />
          <input className={input} name="severity" type="number" min="0" max="100" placeholder="Severity" required />
          <input className={input} name="dueDate" type="date" />
          <select className={input} name="ownerUserId"><option value="">No owner</option>{members.map((membership) => <option key={membership.id} value={membership.userId}>{membership.user.name ?? membership.user.email}</option>)}</select>
          <textarea className={`${input} min-h-20 md:col-span-2`} name="description" placeholder="Description" required />
          <textarea className={`${input} min-h-20 md:col-span-2`} name="mitigationPlan" placeholder="Mitigation plan" />
          <button className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Add finding</button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {supplier.riskFindings.map((finding) => (
          <article key={finding.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black text-blue-700">{finding.type} · Severity {finding.severity}</p>
            <h3 className="mt-2 font-black">{finding.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{finding.description}</p>
            {finding.status !== "RESOLVED" ? (
              <form action={resolveSupplierRiskFindingAction} className="mt-4 flex gap-3">
                <input type="hidden" name="findingId" value={finding.id} />
                <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2" name="mitigationPlan" defaultValue={finding.mitigationPlan ?? ""} />
                <button className="rounded-xl bg-emerald-700 px-4 py-2 font-black text-white">Resolve</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
