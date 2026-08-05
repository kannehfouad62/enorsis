import {
  addCategoryMarketSignalAction,
  addCategoryOpportunityAction,
  approveCategoryStrategyAction,
  createCategoryStrategyAction,
} from "@/modules/category-management/actions";
import { getCategoryManagementWorkspace } from "@/modules/category-management/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function CategoryManagementPage() {
  const data = await getCategoryManagementWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Strategic category management
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Categories & Market Intelligence
      </h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active strategies" value={data.metrics.activeStrategies} />
        <Metric label="Addressable spend" value={data.metrics.addressableSpend} money />
        <Metric label="Managed spend" value={data.metrics.managedSpend} money />
        <Metric label="Opportunity value" value={data.metrics.opportunityValue} money />
        <Metric label="Negative signals" value={data.metrics.negativeSignals} />
        <Metric label="Concentrated categories" value={data.metrics.supplierConcentration} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create category strategy</h2>
        <form action={createCategoryStrategyAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="categoryCode" placeholder="Category code" />
          <input className={input} name="categoryName" placeholder="Category name" required />
          <input className={input} name="title" placeholder="Strategy title" required />
          <select className={input} name="executiveSponsorUserId">
            <option value="">No executive sponsor</option>
            {data.members.map((membership) => (
              <option key={membership.id} value={membership.userId}>
                {membership.user.name ?? membership.user.email}
              </option>
            ))}
          </select>
          <input className={input} name="periodStart" type="date" required />
          <input className={input} name="periodEnd" type="date" required />
          <input className={input} name="currencyCode" defaultValue="USD" />
          <input className={input} name="addressableSpend" type="number" step="0.01" placeholder="Addressable spend" />
          <input className={input} name="managedSpend" type="number" step="0.01" placeholder="Managed spend" />
          <input className={input} name="supplierCount" type="number" min="0" defaultValue="0" />
          <input className={input} name="preferredSupplierCount" type="number" min="0" defaultValue="0" />
          <input className={input} name="savingsTarget" type="number" step="0.01" placeholder="Savings target" />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Strategy description" required />
          <textarea className={`${input} min-h-20`} name="riskSummary" placeholder="Risk summary" />
          <textarea className={`${input} min-h-20`} name="demandDrivers" placeholder="Demand drivers" />
          <textarea className={`${input} min-h-20`} name="supplyMarketSummary" placeholder="Supply market summary" />
          <textarea className={`${input} min-h-20`} name="strategicObjectives" placeholder="Strategic objectives" />
          <textarea className={`${input} min-h-20`} name="supplierApproach" placeholder="Supplier approach" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create strategy
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Category portfolio</h2>
        <div className="mt-5 space-y-6">
          {data.strategies.map((strategy) => (
            <article key={strategy.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {strategy.categoryCode ?? strategy.category} · {strategy.status}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {strategy.title ?? strategy.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {strategy.categoryName ?? strategy.category} · Addressable $
                {Number(strategy.addressableSpend).toLocaleString()} ·{" "}
                {strategy.opportunities.length} opportunities
              </p>

              {strategy.status !== "ACTIVE" ? (
                <form action={approveCategoryStrategyAction} className="mt-4">
                  <input type="hidden" name="strategyId" value={strategy.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                    Approve and activate
                  </button>
                </form>
              ) : null}

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <form action={addCategoryOpportunityAction} className="grid gap-3">
                  <input type="hidden" name="categoryStrategyId" value={strategy.id} />
                  <input className={input} name="title" placeholder="Opportunity title" required />
                  <textarea className={`${input} min-h-20`} name="description" placeholder="Description" required />
                  <select className={input} name="type">
                    <option>SOURCING</option>
                    <option>RENEGOTIATION</option>
                    <option>DEMAND_MANAGEMENT</option>
                    <option>SPECIFICATION_OPTIMIZATION</option>
                    <option>SUPPLIER_CONSOLIDATION</option>
                    <option>PROCESS_IMPROVEMENT</option>
                    <option>RISK_REDUCTION</option>
                    <option>SUSTAINABILITY</option>
                    <option>OTHER</option>
                  </select>
                  <input className={input} name="estimatedValue" type="number" step="0.01" placeholder="Estimated value" />
                  <input className={input} name="probabilityPercent" type="number" min="0" max="100" defaultValue="50" />
                  <input className={input} name="complexityScore" type="number" min="1" max="5" defaultValue="3" />
                  <input className={input} name="riskScore" type="number" min="1" max="5" defaultValue="3" />
                  <select className={input} name="ownerUserId">
                    <option value="">Assign creator</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <input className={input} name="targetStartAt" type="date" />
                  <input className={input} name="targetCompletionAt" type="date" />
                  <input className={input} name="assumptions" placeholder="Assumptions" />
                  <input className={input} name="blockers" placeholder="Blockers" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Add opportunity
                  </button>
                </form>

                <form action={addCategoryMarketSignalAction} className="grid gap-3">
                  <input type="hidden" name="categoryStrategyId" value={strategy.id} />
                  <select className={input} name="type">
                    <option>PRICE</option>
                    <option>CAPACITY</option>
                    <option>SUPPLY_RISK</option>
                    <option>REGULATORY</option>
                    <option>TECHNOLOGY</option>
                    <option>GEOPOLITICAL</option>
                    <option>SUSTAINABILITY</option>
                    <option>LABOR</option>
                    <option>OTHER</option>
                  </select>
                  <select className={input} name="direction">
                    <option>POSITIVE</option>
                    <option>NEUTRAL</option>
                    <option>NEGATIVE</option>
                  </select>
                  <input className={input} name="title" placeholder="Signal title" required />
                  <textarea className={`${input} min-h-20`} name="description" placeholder="Signal description" required />
                  <input className={input} name="source" placeholder="Source" />
                  <input className={input} name="sourceUrl" type="url" placeholder="Source URL" />
                  <input className={input} name="confidencePercent" type="number" min="0" max="100" defaultValue="50" />
                  <input className={input} name="impactScore" type="number" min="1" max="5" defaultValue="3" />
                  <input className={input} name="observedAt" type="date" required />
                  <input className={input} name="expiresAt" type="date" />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                    Add market signal
                  </button>
                </form>
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
