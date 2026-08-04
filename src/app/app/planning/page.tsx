import {
  activateProcurementPlanAction,
  addSavingsMilestoneAction,
  createCategoryStrategyAction,
  createProcurementPlanAction,
  createSavingsInitiativeAction,
  updateSavingsInitiativeAction,
} from "@/modules/procurement-planning/actions";
import { getProcurementPlanningWorkspace } from "@/modules/procurement-planning/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementPlanningPage() {
  const data = await getProcurementPlanningWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Strategic procurement
      </p>
      <h1 className="mt-3 text-4xl font-black">Planning & Savings</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Align annual procurement plans, category strategies and finance-validated
        savings initiatives with measurable realized value.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active plans" value={data.metrics.activePlans} />
        <Metric label="Category strategies" value={data.metrics.activeStrategies} />
        <Metric label="Savings pipeline" value={data.metrics.pipelineCount} />
        <Metric label="Target savings" value={data.metrics.totalTarget} money />
        <Metric label="Validated savings" value={data.metrics.validated} money />
        <Metric label="Realized savings" value={data.metrics.realized} money />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <h2 className="text-xl font-black">Annual procurement plan</h2>
          <form action={createProcurementPlanAction} className="mt-5 grid gap-3">
            <input className={input} name="name" placeholder="Plan name" required />
            <input className={input} name="fiscalYear" type="number" defaultValue={new Date().getFullYear()} required />
            <textarea className={`${input} min-h-24`} name="objective" placeholder="Strategic objective" required />
            <input className={input} name="approvedBudget" type="number" step="0.01" placeholder="Approved budget" required />
            <input className={input} name="savingsTarget" type="number" step="0.01" placeholder="Savings target" required />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create plan
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Category strategy</h2>
          <form action={createCategoryStrategyAction} className="mt-5 grid gap-3">
            <select className={input} name="procurementPlanId">
              <option value="">No linked plan</option>
              {data.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <input className={input} name="category" placeholder="Category" required />
            <input className={input} name="name" placeholder="Strategy name" required />
            <input className={input} name="currentSpend" type="number" step="0.01" placeholder="Current spend" />
            <input className={input} name="addressableSpend" type="number" step="0.01" placeholder="Addressable spend" />
            <input className={input} name="savingsTarget" type="number" step="0.01" placeholder="Savings target" />
            <input className={input} name="supplierCount" type="number" placeholder="Supplier count" />
            <textarea className={`${input} min-h-20`} name="riskSummary" placeholder="Risk summary" />
            <textarea className={`${input} min-h-20`} name="marketSummary" placeholder="Market summary" />
            <textarea className={`${input} min-h-24`} name="strategySummary" placeholder="Strategy summary" required />
            <input className={input} name="sourcingApproach" placeholder="Sourcing approach" />
            <input className={input} name="contractApproach" placeholder="Contract approach" />
            <input className={input} name="supplierApproach" placeholder="Supplier approach" />
            <input className={input} name="startsAt" type="date" required />
            <input className={input} name="targetCompletionAt" type="date" required />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Create strategy
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Savings initiative</h2>
          <form action={createSavingsInitiativeAction} className="mt-5 grid gap-3">
            <select className={input} name="procurementPlanId">
              <option value="">No linked plan</option>
              {data.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <select className={input} name="categoryStrategyId">
              <option value="">No category strategy</option>
              {data.strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
              ))}
            </select>
            <input className={input} name="name" placeholder="Initiative name" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Initiative description" required />
            <select className={input} name="type" defaultValue="COST_REDUCTION">
              <option>COST_REDUCTION</option>
              <option>COST_AVOIDANCE</option>
              <option>WORKING_CAPITAL</option>
              <option>DEMAND_REDUCTION</option>
              <option>PROCESS_EFFICIENCY</option>
              <option>RISK_AVOIDANCE</option>
            </select>
            <input className={input} name="category" placeholder="Category" />
            <input className={input} name="baselineAmount" type="number" step="0.01" placeholder="Baseline amount" required />
            <input className={input} name="targetSavings" type="number" step="0.01" placeholder="Target savings" required />
            <input className={input} name="currencyCode" defaultValue="USD" />
            <input className={input} name="confidencePercent" type="number" min="0" max="100" defaultValue="50" />
            <input className={input} name="startsAt" type="date" required />
            <input className={input} name="targetRealizationAt" type="date" required />
            <input className={input} name="sourceType" placeholder="Source type" />
            <input className={input} name="sourceId" placeholder="Source record ID" />
            <textarea className={`${input} min-h-20`} name="assumptions" placeholder="Assumptions" />
            <textarea className={`${input} min-h-20`} name="risks" placeholder="Risks" />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
              Create initiative
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Procurement plans</h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {data.plans.map((plan) => (
            <article key={plan.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                FY{plan.fiscalYear} · {plan.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                Budget ${Number(plan.approvedBudget).toLocaleString()} · Target ${Number(plan.savingsTarget).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {plan.categoryStrategies.length} strategies · {plan.savingsInitiatives.length} initiatives
              </p>
              {plan.status === "DRAFT" ? (
                <form action={activateProcurementPlanAction} className="mt-4">
                  <input type="hidden" name="planId" value={plan.id} />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
                    Activate plan
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Savings portfolio</h2>
        <div className="mt-5 space-y-4">
          {data.initiatives.map((initiative) => (
            <article key={initiative.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-emerald-700">
                {initiative.initiativeNumber} · {initiative.type} · {initiative.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{initiative.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                Target ${Number(initiative.targetSavings).toLocaleString()} · Validated ${Number(initiative.validatedSavings).toLocaleString()} · Realized ${Number(initiative.realizedSavings).toLocaleString()}
              </p>
              <form action={updateSavingsInitiativeAction} className="mt-4 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="initiativeId" value={initiative.id} />
                <select className={input} name="status" defaultValue={initiative.status}>
                  <option>IDEA</option>
                  <option>VALIDATED</option>
                  <option>APPROVED</option>
                  <option>IN_EXECUTION</option>
                  <option>REALIZED</option>
                  <option>CANCELLED</option>
                </select>
                <input className={input} name="validatedSavings" type="number" step="0.01" defaultValue={initiative.validatedSavings.toString()} />
                <input className={input} name="realizedSavings" type="number" step="0.01" defaultValue={initiative.realizedSavings.toString()} />
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                  Update
                </button>
              </form>
              <form action={addSavingsMilestoneAction} className="mt-4 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="initiativeId" value={initiative.id} />
                <input className={input} name="name" placeholder="Milestone" required />
                <input className={input} name="description" placeholder="Description" />
                <input className={input} name="dueAt" type="date" required />
                <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                  Add milestone
                </button>
              </form>
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
