import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  GitCompareArrows,
  ShieldAlert,
  Truck,
  Warehouse,
} from "lucide-react";
import {
  createDigitalTwinScenarioAction,
  runDigitalTwinScenarioAction,
} from "@/modules/digital-twin/actions";
import { getDigitalTwinWorkspace } from "@/modules/digital-twin/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function DigitalTwinPage() {
  const data = await getDigitalTwinWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B8.4 · Predictive Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Procurement Digital Twin & Scenario Simulation
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Simulate demand shocks, supplier disruption, lead-time
          increases, inflation, inbound constraints and safety-stock
          changes against the latest predictive procurement,
          inventory and capacity baselines. Simulations never mutate
          live procurement or inventory records.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric
          label="Scenarios"
          value={data.metrics.scenarioCount}
        />
        <Metric
          label="Simulation runs"
          value={data.metrics.runCount}
        />
        <Metric
          label="High-severity impacts"
          value={data.metrics.highSeverityImpacts}
        />
        <Metric
          label="Latest risk"
          value={data.metrics.latestRisk}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Create what-if scenario
          </h2>
        </div>

        <form
          action={createDigitalTwinScenarioAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <input
            className={input}
            name="name"
            placeholder="Scenario name"
            required
          />
          <select
            className={input}
            name="scenarioType"
            defaultValue="COMBINED"
          >
            <option value="COMBINED">Combined</option>
            <option value="DEMAND_SHOCK">Demand shock</option>
            <option value="SUPPLIER_DISRUPTION">
              Supplier disruption
            </option>
            <option value="COST_INFLATION">
              Cost inflation
            </option>
            <option value="LEAD_TIME_SHOCK">
              Lead-time shock
            </option>
            <option value="CAPACITY_PRESSURE">
              Capacity pressure
            </option>
          </select>

          <select
            className={input}
            name="horizonDays"
            defaultValue="90"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
          </select>

          <input
            className={input}
            name="demandShockPct"
            type="number"
            step="0.1"
            defaultValue="0"
            placeholder="Demand shock %"
          />
          <input
            className={input}
            name="leadTimeShockPct"
            type="number"
            step="0.1"
            defaultValue="0"
            placeholder="Lead-time shock %"
          />
          <input
            className={input}
            name="costInflationPct"
            type="number"
            step="0.1"
            defaultValue="0"
            placeholder="Cost inflation %"
          />
          <input
            className={input}
            name="supplierDisruptionPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue="0"
            placeholder="Supplier disruption %"
          />
          <input
            className={input}
            name="inboundReductionPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue="0"
            placeholder="Inbound reduction %"
          />
          <input
            className={input}
            name="safetyStockChangePct"
            type="number"
            step="0.1"
            defaultValue="0"
            placeholder="Safety-stock change %"
          />

          <textarea
            className={`${input} min-h-28 md:col-span-2`}
            name="description"
            placeholder="Scenario description and business context"
          />

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white md:col-span-2">
            Save scenario
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Scenario library
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.scenarios.map((scenario) => (
            <article
              key={scenario.id}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">
                    {scenario.scenarioType} · {scenario.status}
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    {scenario.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {scenario.description ??
                      "No description provided."}
                  </p>
                </div>
                <form action={runDigitalTwinScenarioAction}>
                  <input
                    type="hidden"
                    name="scenarioId"
                    value={scenario.id}
                  />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
                    Run simulation
                  </button>
                </form>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>
                  Demand {Number(scenario.demandShockPct).toFixed(1)}%
                </span>
                <span>
                  Lead time {Number(scenario.leadTimeShockPct).toFixed(1)}%
                </span>
                <span>
                  Cost {Number(scenario.costInflationPct).toFixed(1)}%
                </span>
                <span>
                  Supplier disruption{" "}
                  {Number(
                    scenario.supplierDisruptionPct,
                  ).toFixed(1)}
                  %
                </span>
                <span>
                  Inbound reduction{" "}
                  {Number(
                    scenario.inboundReductionPct,
                  ).toFixed(1)}
                  %
                </span>
                <span>
                  Safety stock{" "}
                  {Number(
                    scenario.safetyStockChangePct,
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {data.latestRun ? (
        <>
          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Latest simulation · {data.latestRun.modelVersion}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {data.latestScenario?.name ??
                    "Digital Twin Scenario"}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-black">
                  {data.latestRun.riskLevel}
                </p>
                <p className="text-xs text-slate-500">
                  {data.latestRun.recommendation.replaceAll(
                    "_",
                    " ",
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Impact</th>
                    <th className="px-4 py-3">Baseline</th>
                    <th className="px-4 py-3">Scenario</th>
                    <th className="px-4 py-3">Variance</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.impacts.map((impact) => (
                    <tr key={impact.id}>
                      <td className="px-4 py-3">
                        <ImpactLabel type={impact.impactType} />
                      </td>
                      <NumberCell value={impact.baselineValue} />
                      <NumberCell value={impact.scenarioValue} />
                      <td className="px-4 py-3">
                        {impact.variancePct === null
                          ? "—"
                          : `${Number(
                              impact.variancePct,
                            ).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 font-black">
                        {impact.severity}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {impact.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Digital-twin outputs are simulated planning evidence only.
          They do not update supplier status, purchase orders,
          replenishment settings, inventory quantities, contracts or
          warehouse capacity. Human review remains mandatory before
          any operational response.
        </p>
      </div>
    </div>
  );
}

function ImpactLabel({ type }: { type: string }) {
  const icon =
    type === "SPEND" ? (
      <CircleDollarSign className="h-4 w-4" />
    ) : type === "DEMAND" ? (
      <Boxes className="h-4 w-4" />
    ) : type === "INBOUND" ? (
      <Truck className="h-4 w-4" />
    ) : type === "CAPACITY" ? (
      <Warehouse className="h-4 w-4" />
    ) : (
      <ShieldAlert className="h-4 w-4" />
    );

  return (
    <span className="inline-flex items-center gap-2 font-black">
      {icon}
      {type.replaceAll("_", " ")}
    </span>
  );
}

function NumberCell({ value }: { value: unknown }) {
  return (
    <td className="px-4 py-3">
      {value === null || value === undefined
        ? "—"
        : Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
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
