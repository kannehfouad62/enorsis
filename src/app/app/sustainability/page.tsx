import {
  createResponsibleSourcingAssessmentAction,
  createSupplierEsgProfileAction,
  createSustainabilityImprovementAction,
  updateSustainabilityImprovementAction,
} from "@/modules/sustainable-procurement/actions";
import { getSustainableProcurementWorkspace } from "@/modules/sustainable-procurement/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SustainableProcurementPage() {
  const data = await getSustainableProcurementWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Responsible sourcing
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Sustainable Procurement
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern supplier ESG performance, emissions, diversity,
        responsible-sourcing assessments and improvement plans.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Assessed suppliers" value={data.metrics.assessedSuppliers} />
        <Metric label="High-risk suppliers" value={data.metrics.highRiskSuppliers} />
        <Metric label="Diverse suppliers" value={data.metrics.diversitySuppliers} />
        <Metric label="Assessments due" value={data.metrics.assessmentsDue} />
        <Metric label="Open improvements" value={data.metrics.openImprovements} />
        <Metric label="Reported emissions" value={data.metrics.reportedEmissions} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create supplier ESG profile</h2>
        <form
          action={createSupplierEsgProfileAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName}
              </option>
            ))}
          </select>
          <select className={input} name="riskLevel" defaultValue="MODERATE">
            <option>LOW</option>
            <option>MODERATE</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
          <input className={input} name="scope1Emissions" type="number" step="0.0001" placeholder="Scope 1 emissions" />
          <input className={input} name="scope2Emissions" type="number" step="0.0001" placeholder="Scope 2 emissions" />
          <input className={input} name="scope3Emissions" type="number" step="0.0001" placeholder="Scope 3 emissions" />
          <input className={input} name="emissionsUnit" defaultValue="tCO2e" />
          <input className={input} name="renewableEnergyPercent" type="number" min="0" max="100" step="0.01" placeholder="Renewable energy %" />
          <input className={input} name="wasteDiversionPercent" type="number" min="0" max="100" step="0.01" placeholder="Waste diversion %" />
          <input className={input} name="waterUse" type="number" step="0.0001" placeholder="Water use" />
          <select className={input} name="diversityClassification">
            <option>NONE</option>
            <option>MINORITY_OWNED</option>
            <option>WOMEN_OWNED</option>
            <option>VETERAN_OWNED</option>
            <option>DISABILITY_OWNED</option>
            <option>LGBTQ_OWNED</option>
            <option>SMALL_BUSINESS</option>
            <option>LOCAL_BUSINESS</option>
            <option>SOCIAL_ENTERPRISE</option>
            <option>OTHER</option>
          </select>
          <input className={input} name="diversityCertificationId" placeholder="Certification ID" />
          <input className={input} name="certificationExpiresAt" type="date" />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="humanRightsPolicy" />
            Human-rights policy
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="modernSlaveryStatement" />
            Modern-slavery statement
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="conflictMineralsDeclaration" />
            Conflict-minerals declaration
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="codeOfConductAccepted" />
            Supplier code accepted
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create ESG profile
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Supplier ESG portfolio</h2>
        <div className="mt-5 space-y-6">
          {data.profiles.map((profile) => (
            <article key={profile.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {profile.status} · {profile.riskLevel} RISK ·{" "}
                {profile.diversityClassification.replaceAll("_", " ")}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {profile.supplier.tradingName ??
                  profile.supplier.legalName}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                ESG score{" "}
                {profile.overallScore?.toString() ?? "Not assessed"} ·{" "}
                {profile.improvementPlans.length} improvement plans
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                <form
                  action={createResponsibleSourcingAssessmentAction}
                  className="grid gap-3"
                >
                  <input type="hidden" name="supplierEsgProfileId" value={profile.id} />
                  <input className={input} name="assessmentPeriod" placeholder="Assessment period" required />
                  <input className={input} name="environmentalScore" type="number" min="0" max="100" step="0.01" placeholder="Environmental score" required />
                  <input className={input} name="socialScore" type="number" min="0" max="100" step="0.01" placeholder="Social score" required />
                  <input className={input} name="governanceScore" type="number" min="0" max="100" step="0.01" placeholder="Governance score" required />
                  <textarea className={`${input} min-h-20`} name="findings" placeholder="Assessment findings" />
                  <input className={input} name="expiresAt" type="date" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Record assessment
                  </button>
                </form>

                <form
                  action={createSustainabilityImprovementAction}
                  className="grid gap-3"
                >
                  <input type="hidden" name="supplierEsgProfileId" value={profile.id} />
                  <input className={input} name="title" placeholder="Improvement title" required />
                  <textarea className={`${input} min-h-20`} name="description" placeholder="Improvement description" required />
                  <input className={input} name="category" placeholder="Category" required />
                  <input className={input} name="targetMetric" placeholder="Target metric" />
                  <input className={input} name="baselineValue" type="number" step="0.0001" placeholder="Baseline" />
                  <input className={input} name="targetValue" type="number" step="0.0001" placeholder="Target" />
                  <input className={input} name="dueAt" type="date" required />
                  <select className={input} name="ownerUserId">
                    <option value="">Assign creator</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <input className={input} name="supplierOwnerName" placeholder="Supplier owner" />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                    Add improvement
                  </button>
                </form>

                <div className="space-y-3">
                  {profile.improvementPlans.map((plan) => (
                    <form
                      key={plan.id}
                      action={updateSustainabilityImprovementAction}
                      className="rounded-2xl bg-white p-4"
                    >
                      <input type="hidden" name="improvementId" value={plan.id} />
                      <p className="font-black">{plan.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due {plan.dueAt.toLocaleDateString()}
                      </p>
                      <select className={input} name="status" defaultValue={plan.status}>
                        <option>OPEN</option>
                        <option>IN_PROGRESS</option>
                        <option>BLOCKED</option>
                        <option>COMPLETED</option>
                        <option>CANCELLED</option>
                      </select>
                      <input className={input} name="blocker" placeholder="Blocker" />
                      <input className={input} name="completionEvidence" placeholder="Completion evidence" />
                      <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                        Update
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value.toLocaleString()}</p>
    </article>
  );
}
