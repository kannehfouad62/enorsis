import {
  addProcurementBenefitAction,
  addValueMilestoneAction,
  createValueInitiativeAction,
  updateValueMilestoneAction,
  validateProcurementBenefitAction,
} from "@/modules/value-realization/actions";
import { getValueRealizationWorkspace } from "@/modules/value-realization/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ValueRealizationPage() {
  const data = await getValueRealizationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Procurement performance
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Savings & Value Realization
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern procurement initiatives from opportunity qualification
        through finance validation, realization and leakage control.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active initiatives" value={data.metrics.activeInitiatives} />
        <Metric label="Target value" value={data.metrics.targetValue} money />
        <Metric label="Forecast value" value={data.metrics.forecastValue} money />
        <Metric label="Realized value" value={data.metrics.realizedValue} money />
        <Metric label="Value leakage" value={data.metrics.leakageValue} money />
        <Metric label="Overdue milestones" value={data.metrics.overdueMilestones} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create value initiative</h2>
        <form
          action={createValueInitiativeAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input className={input} name="title" placeholder="Initiative title" required />
          <input className={input} name="category" placeholder="Category" />
          <select className={input} name="supplierId">
            <option value="">No linked supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName}
              </option>
            ))}
          </select>
          <input className={input} name="sourcingEventId" placeholder="Sourcing event ID" />
          <input className={input} name="contractId" placeholder="Contract ID" />
          <select className={input} name="financeOwnerUserId">
            <option value="">No finance owner</option>
            {data.members.map((membership) => (
              <option key={membership.id} value={membership.userId}>
                {membership.user.name ?? membership.user.email}
              </option>
            ))}
          </select>
          <select className={input} name="executiveSponsorUserId">
            <option value="">No executive sponsor</option>
            {data.members.map((membership) => (
              <option key={membership.id} value={membership.userId}>
                {membership.user.name ?? membership.user.email}
              </option>
            ))}
          </select>
          <input className={input} name="currencyCode" defaultValue="USD" />
          <input className={input} name="baselineAmount" type="number" step="0.01" placeholder="Baseline amount" />
          <input className={input} name="targetBenefitAmount" type="number" step="0.01" placeholder="Target benefit" />
          <input className={input} name="forecastBenefitAmount" type="number" step="0.01" placeholder="Forecast benefit" />
          <input className={input} name="probabilityPercent" type="number" min="0" max="100" defaultValue="50" />
          <input className={input} name="startsAt" type="date" required />
          <input className={input} name="targetCompletionAt" type="date" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Initiative description" required />
          <textarea className={`${input} min-h-20`} name="assumptions" placeholder="Assumptions" />
          <textarea className={`${input} min-h-20`} name="risks" placeholder="Risks" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create initiative
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Value portfolio</h2>
        <div className="mt-5 space-y-6">
          {data.initiatives.map((initiative) => (
            <article key={initiative.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {initiative.initiativeNumber} · {initiative.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{initiative.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                Target ${Number(initiative.targetBenefitAmount).toLocaleString()} ·
                Realized ${Number(initiative.realizedBenefitAmount).toLocaleString()} ·{" "}
                {initiative.benefits.length} benefits
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                <form action={addProcurementBenefitAction} className="grid gap-3">
                  <input type="hidden" name="initiativeId" value={initiative.id} />
                  <select className={input} name="type">
                    <option>COST_REDUCTION</option>
                    <option>COST_AVOIDANCE</option>
                    <option>WORKING_CAPITAL</option>
                    <option>REVENUE_ENABLEMENT</option>
                    <option>RISK_REDUCTION</option>
                    <option>PRODUCTIVITY</option>
                    <option>SUSTAINABILITY</option>
                    <option>OTHER</option>
                  </select>
                  <input className={input} name="name" placeholder="Benefit name" required />
                  <select className={input} name="frequency">
                    <option>ONE_TIME</option>
                    <option>MONTHLY</option>
                    <option>QUARTERLY</option>
                    <option>ANNUAL</option>
                  </select>
                  <input className={input} name="periodStart" type="date" required />
                  <input className={input} name="periodEnd" type="date" />
                  <input className={input} name="forecastAmount" type="number" step="0.01" placeholder="Forecast amount" />
                  <input className={input} name="claimedAmount" type="number" step="0.01" placeholder="Claimed amount" />
                  <textarea className={`${input} min-h-20`} name="methodology" placeholder="Benefit methodology" required />
                  <input className={input} name="evidenceUrl" type="url" placeholder="Evidence URL" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Submit benefit
                  </button>
                </form>

                <form action={addValueMilestoneAction} className="grid gap-3">
                  <input type="hidden" name="initiativeId" value={initiative.id} />
                  <input className={input} name="name" placeholder="Milestone name" required />
                  <textarea className={`${input} min-h-20`} name="description" placeholder="Description" />
                  <input className={input} name="dueAt" type="date" required />
                  <select className={input} name="ownerUserId">
                    <option value="">Assign creator</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                    Add milestone
                  </button>
                </form>

                <div className="space-y-3">
                  {initiative.benefits.map((benefit) => (
                    <form
                      key={benefit.id}
                      action={validateProcurementBenefitAction}
                      className="rounded-2xl bg-white p-4"
                    >
                      <input type="hidden" name="benefitId" value={benefit.id} />
                      <p className="font-black">{benefit.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {benefit.validationStatus} · Claimed $
                        {Number(benefit.claimedAmount).toLocaleString()}
                      </p>
                      {benefit.validationStatus === "SUBMITTED" ? (
                        <>
                          <input className={input} name="validatedAmount" type="number" step="0.01" placeholder="Validated amount" />
                          <input className={input} name="realizedAmount" type="number" step="0.01" placeholder="Realized amount" />
                          <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                            Finance validate
                          </button>
                        </>
                      ) : null}
                    </form>
                  ))}

                  {initiative.milestones.map((milestone) => (
                    <form
                      key={milestone.id}
                      action={updateValueMilestoneAction}
                      className="rounded-2xl bg-white p-4"
                    >
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <p className="font-black">{milestone.name}</p>
                      <select className={input} name="status" defaultValue={milestone.status}>
                        <option>NOT_STARTED</option>
                        <option>IN_PROGRESS</option>
                        <option>COMPLETED</option>
                        <option>BLOCKED</option>
                        <option>CANCELLED</option>
                      </select>
                      <input className={input} name="blocker" placeholder="Blocker" />
                      <input className={input} name="completionEvidence" placeholder="Completion evidence" />
                      <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                        Update milestone
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
  money = false,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {money ? `$${value.toLocaleString()}` : value}
      </p>
    </article>
  );
}
