import Link from "next/link";
import {
  AlertTriangle,
  ChartSpline,
  CircleDollarSign,
  PackageSearch,
  ShieldAlert,
} from "lucide-react";
import { generatePredictiveProcurementForecastAction } from "@/modules/predictive-procurement/actions";
import { getPredictiveProcurementWorkspace } from "@/modules/predictive-procurement/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function PredictiveProcurementPage() {
  const data = await getPredictiveProcurementWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B8.1 · Predictive Procurement
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Procurement Forecasting
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Forecast spend direction, demand shifts and supplier
            risk from tenant procurement evidence. Forecasts are
            explainable decision support and do not create purchase
            orders or supplier decisions automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/demand-planning"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Demand Planning
          </Link>
          <Link
            href="/app/analytics/spend"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Spend Intelligence
          </Link>
        </div>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ChartSpline className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Generate predictive forecast
          </h2>
        </div>
        <form
          action={generatePredictiveProcurementForecastAction}
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-black uppercase text-slate-500">
            Forecast horizon
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
          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Generate forecast
          </button>
        </form>
      </section>

      {data.latestRun ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Forecast signals" value={data.metrics.totalSignals} />
            <Metric label="Critical" value={data.metrics.critical} />
            <Metric label="High" value={data.metrics.high} />
            <Metric label="Demand signals" value={data.metrics.demand} />
            <Metric label="Supplier risks" value={data.metrics.supplierRisk} />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Latest run · {data.latestRun.modelVersion}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {data.latestRun.horizonDays}-day predictive horizon
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Generated {data.latestRun.generatedAt.toLocaleString()}
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Signal</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Forecast</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.signals.map((signal) => (
                    <tr key={signal.id}>
                      <td className="px-4 py-3">
                        <SignalIcon type={signal.signalType} />
                      </td>
                      <td className="px-4 py-3 font-black">
                        {signal.scopeLabel}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(signal.currentValue)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(signal.forecastValue)}
                      </td>
                      <td className="px-4 py-3">
                        {signal.changePercent === null
                          ? "—"
                          : `${Number(signal.changePercent).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3">
                        {signal.confidence === null
                          ? "—"
                          : `${Number(signal.confidence).toFixed(0)}%`}
                      </td>
                      <td className="px-4 py-3 font-black">
                        {signal.riskLevel}
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
          <p className="text-sm text-slate-600">
            No predictive forecast has been generated yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Forecast run history
        </h2>
        <div className="mt-4 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {run.horizonDays}-day forecast
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.modelVersion} · {run.status}
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
          Predictive outputs are planning signals, not approvals.
          Human review and existing procurement governance remain
          mandatory before operational action.
        </p>
      </div>
    </div>
  );
}

function SignalIcon({ type }: { type: string }) {
  if (type === "SPEND_FORECAST") {
    return (
      <span className="inline-flex items-center gap-2 font-bold">
        <CircleDollarSign className="h-4 w-4 text-blue-700" />
        Spend
      </span>
    );
  }

  if (type === "SUPPLIER_RISK_FORECAST") {
    return (
      <span className="inline-flex items-center gap-2 font-bold">
        <ShieldAlert className="h-4 w-4 text-rose-700" />
        Supplier risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 font-bold">
      <PackageSearch className="h-4 w-4 text-emerald-700" />
      Demand
    </span>
  );
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
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
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
