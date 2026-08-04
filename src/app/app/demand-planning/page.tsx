import {
  addDemandForecastAction,
  approveReplenishmentRecommendationAction,
  createDemandPlanAction,
  generateReplenishmentRecommendationsAction,
} from "@/modules/demand-planning/actions";
import { getDemandPlanningWorkspace } from "@/modules/demand-planning/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function DemandPlanningPage() {
  const data = await getDemandPlanningWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supply planning
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Demand Planning & Replenishment
      </h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active plans" value={data.metrics.activePlans} />
        <Metric label="Forecast items" value={data.metrics.forecastItems} />
        <Metric label="Proposed orders" value={data.metrics.proposed} />
        <Metric label="Approved orders" value={data.metrics.approved} />
        <Metric label="Planned value" value={data.metrics.plannedValue} money />
        <Metric label="Stockout risks" value={data.metrics.stockoutRisks} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create demand plan</h2>
        <form action={createDemandPlanAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="name" placeholder="Plan name" required />
          <input className={input} name="periodStart" type="date" required />
          <input className={input} name="periodEnd" type="date" required />
          <input className={input} name="planningHorizonDays" type="number" min="1" defaultValue="90" />
          <textarea className={`${input} min-h-20 md:col-span-2`} name="description" placeholder="Planning assumptions" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create plan
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Plan portfolio</h2>
        <div className="mt-5 space-y-6">
          {data.plans.map((plan) => (
            <article key={plan.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {plan.status} · {plan.periodStart.toLocaleDateString()} –{" "}
                {plan.periodEnd.toLocaleDateString()}
              </p>
              <h3 className="mt-2 text-lg font-black">{plan.name}</h3>

              <form action={addDemandForecastAction} className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <input type="hidden" name="demandPlanId" value={plan.id} />
                <select className={input} name="inventoryItemId" required>
                  <option value="">Select item</option>
                  {data.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} — {item.name}
                    </option>
                  ))}
                </select>
                <select className={input} name="method">
                  <option>MANUAL</option>
                  <option>MOVING_AVERAGE</option>
                  <option>WEIGHTED_AVERAGE</option>
                  <option>SEASONAL</option>
                  <option>CONSUMPTION_BASED</option>
                  <option>IMPORTED</option>
                </select>
                <input className={input} name="forecastQuantity" type="number" step="0.0001" placeholder="Forecast quantity" required />
                <input className={input} name="historicalConsumption" type="number" step="0.0001" placeholder="Historical use" />
                <input className={input} name="committedDemand" type="number" step="0.0001" defaultValue="0" />
                <input className={input} name="safetyStockDemand" type="number" step="0.0001" defaultValue="0" />
                <input className={input} name="confidencePercent" type="number" min="0" max="100" defaultValue="50" />
                <input className={input} name="assumptions" placeholder="Assumptions" />
                <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                  Add forecast
                </button>
              </form>

              <form action={generateReplenishmentRecommendationsAction} className="mt-4">
                <input type="hidden" name="demandPlanId" value={plan.id} />
                <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                  Generate recommendations
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Replenishment queue</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Available</th>
              <th className="p-3">Demand</th>
              <th className="p-3">Recommended</th>
              <th className="p-3">Value</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recommendations.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3 font-black">
                  {item.inventoryItem.sku} — {item.inventoryItem.name}
                </td>
                <td className="p-3">{item.plan.name}</td>
                <td className="p-3">{item.currentAvailable.toString()}</td>
                <td className="p-3">{item.forecastDemand.toString()}</td>
                <td className="p-3">{item.recommendedQuantity.toString()}</td>
                <td className="p-3">
                  ${Number(item.estimatedTotalCost ?? 0).toLocaleString()}
                </td>
                <td className="p-3 font-black">{item.status}</td>
                <td className="p-3">
                  {["PROPOSED", "REVIEWED"].includes(item.status) ? (
                    <form action={approveReplenishmentRecommendationAction}>
                      <input type="hidden" name="recommendationId" value={item.id} />
                      <button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                        Approve
                      </button>
                    </form>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
