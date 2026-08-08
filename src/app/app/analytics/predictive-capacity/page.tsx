import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Gauge,
  Warehouse,
} from "lucide-react";
import { generatePredictiveCapacityPlanAction } from "@/modules/predictive-capacity/actions";
import { getPredictiveCapacityWorkspace } from "@/modules/predictive-capacity/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function PredictiveCapacityPage() {
  const data = await getPredictiveCapacityWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B8.3 · Predictive Procurement
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Predictive Capacity Planning
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Forecast inventory-unit capacity pressure by active
            location using current stock, projected demand and
            predictive replenishment. This is an operating-capacity
            proxy until physical volume and weight capacities are
            added to warehouse master data.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/analytics/predictive-inventory"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Inventory Optimization
          </Link>
          <Link
            href="/app/warehouse-operations"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Warehouse Operations
          </Link>
        </div>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Generate capacity plan
          </h2>
        </div>
        <form
          action={generatePredictiveCapacityPlanAction}
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-black uppercase text-slate-500">
            Planning horizon
            <select
              className={`${input} mt-2 block`}
              name="horizonDays"
              defaultValue="90"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Target headroom
            <select
              className={`${input} mt-2 block`}
              name="targetHeadroomPct"
              defaultValue="20"
            >
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
            </select>
          </label>
          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Generate capacity plan
          </button>
        </form>
      </section>

      {data.latestRun ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Active locations"
              value={data.metrics.locations}
            />
            <Metric
              label="High pressure"
              value={data.metrics.highPressure}
            />
            <Metric
              label="Over capacity"
              value={data.metrics.projectedOverCapacity}
            />
            <Metric
              label="Capacity gap units"
              value={Math.round(
                data.metrics.totalGapUnits,
              ).toLocaleString()}
            />
          </section>

          {data.enterprise ? (
            <section className={`${card} mt-8`}>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-black">
                  Enterprise capacity outlook
                </h2>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <Metric
                  label="Current units"
                  value={format(
                    data.enterprise.currentUnits,
                  )}
                />
                <Metric
                  label="Projected ending"
                  value={format(
                    data.enterprise.projectedEndingUnits,
                  )}
                />
                <Metric
                  label="Projected utilization"
                  value={`${Number(
                    data.enterprise.projectedUtilizationPct,
                  ).toFixed(1)}%`}
                />
                <Metric
                  label="Risk"
                  value={data.enterprise.riskLevel}
                />
              </div>
            </section>
          ) : null}

          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Latest plan · {data.latestRun.modelVersion}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Location capacity forecast
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {data.latestRun.horizonDays} days ·{" "}
                {Number(
                  data.latestRun.targetHeadroomPct,
                ).toFixed(0)}
                % target headroom
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Demand</th>
                    <th className="px-4 py-3">Inbound</th>
                    <th className="px-4 py-3">Projected</th>
                    <th className="px-4 py-3">Capacity proxy</th>
                    <th className="px-4 py-3">Utilization</th>
                    <th className="px-4 py-3">Gap</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.locationSignals.map((signal) => (
                    <tr key={signal.id}>
                      <td className="px-4 py-3 font-black">
                        {signal.scopeLabel}
                      </td>
                      <Cell value={signal.currentUnits} />
                      <Cell
                        value={signal.projectedDemandUnits}
                      />
                      <Cell
                        value={signal.projectedInboundUnits}
                      />
                      <Cell
                        value={signal.projectedEndingUnits}
                      />
                      <Cell
                        value={signal.operatingCapacityProxy}
                      />
                      <td className="px-4 py-3 font-black">
                        {Number(
                          signal.projectedUtilizationPct,
                        ).toFixed(1)}
                        %
                      </td>
                      <Cell value={signal.capacityGapUnits} />
                      <td className="px-4 py-3">
                        {signal.riskLevel}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                          {signal.recommendation.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className={`${card} mt-8`}>
          <Warehouse className="h-6 w-6 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            No predictive capacity plan has been generated yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Capacity plan history
        </h2>
        <div className="mt-4 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {run.horizonDays}-day capacity plan
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.modelVersion} ·{" "}
                  {Number(run.targetHeadroomPct).toFixed(0)}
                  % headroom
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {run.generatedAt.toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Capacity values in B8.3 are inventory-unit operating
          proxies, not cubic-foot, pallet-position, weight or dock
          capacity limits. Use them for planning pressure and
          redistribution decisions until physical warehouse capacity
          master data is introduced.
        </p>
      </div>
    </div>
  );
}

function Cell({ value }: { value: unknown }) {
  return (
    <td className="px-4 py-3">{format(value)}</td>
  );
}

function format(value: unknown) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
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
