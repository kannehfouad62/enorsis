import {
  refreshEnterpriseKpisAction,
  updateEnterpriseKpiGovernanceAction,
} from "@/modules/enterprise-analytics/kpi-actions";
import { getEnterpriseKpiWorkspace } from "@/modules/enterprise-analytics/kpi-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function displayValue(input: {
  value: number | null;
  metricType: string;
  currencyCode: string | null;
  unit: string | null;
}) {
  if (input.value === null) return "Not calculated";

  if (input.metricType === "CURRENCY") {
    return `${input.currencyCode ?? "USD"} ${input.value.toLocaleString()}`;
  }

  if (input.metricType === "PERCENTAGE") {
    return `${input.value.toFixed(2)}%`;
  }

  return `${input.value.toLocaleString()}${input.unit ? ` ${input.unit}` : ""}`;
}

export default async function EnterpriseKpiPage() {
  const data = await getEnterpriseKpiWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise KPI Engine
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Governed targets, thresholds, trends, domain health scores and
            executive KPI calculation services.
          </p>
        </div>

        <form action={refreshEnterpriseKpisAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Refresh KPI engine
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Enterprise Health
          </p>
          <p className="mt-3 text-4xl font-black">
            {data.score.enterpriseHealthScore}
          </p>
          <p className="mt-2 text-sm text-slate-500">out of 100</p>
        </article>

        <article className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Governed KPIs
          </p>
          <p className="mt-3 text-4xl font-black">
            {data.score.totalMetrics}
          </p>
        </article>

        <article className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Critical KPIs
          </p>
          <p className="mt-3 text-4xl font-black">
            {data.score.criticalMetrics}
          </p>
        </article>

        <article className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Warning KPIs
          </p>
          <p className="mt-3 text-4xl font-black">
            {data.score.warningMetrics}
          </p>
        </article>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Domain health</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.score.domains.map((domain) => (
            <article key={domain.domain} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-black">{domain.domain}</p>
              <p className="mt-2 text-3xl font-black">{domain.healthScore}</p>
              <p className="mt-2 text-xs text-slate-500">
                {domain.metricCount} KPIs · {domain.criticalCount} critical ·{" "}
                {domain.warningCount} warning
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {data.cards.map((metric) => (
          <article key={metric.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {metric.domain} · {metric.healthStatus}
                </p>
                <h2 className="mt-2 text-xl font-black">{metric.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {metric.metricKey} · {metric.trendDirection}
                </p>
              </div>

              <p className="text-2xl font-black">
                {displayValue({
                  value: metric.currentValue,
                  metricType: metric.metricType,
                  currencyCode: metric.currencyCode,
                  unit: metric.unit,
                })}
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Previous</p>
                <p className="mt-1 font-black">
                  {metric.previousValue?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Target</p>
                <p className="mt-1 font-black">
                  {metric.targetValue?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Variance %</p>
                <p className="mt-1 font-black">
                  {metric.variancePercent !== null
                    ? `${metric.variancePercent.toFixed(2)}%`
                    : "—"}
                </p>
              </div>
            </div>

            <form
              action={updateEnterpriseKpiGovernanceAction}
              className="mt-5 grid gap-3 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="metricDefinitionId"
                value={metric.id}
              />

              <label>
                <span className="text-xs font-bold">Target</span>
                <input
                  className={input}
                  name="targetValue"
                  type="number"
                  step="any"
                  defaultValue={metric.targetValue ?? ""}
                />
              </label>

              <label>
                <span className="text-xs font-bold">Warning threshold</span>
                <input
                  className={input}
                  name="warningThreshold"
                  type="number"
                  step="any"
                />
              </label>

              <label>
                <span className="text-xs font-bold">Critical threshold</span>
                <input
                  className={input}
                  name="criticalThreshold"
                  type="number"
                  step="any"
                />
              </label>

              <label>
                <span className="text-xs font-bold">Direction</span>
                <select
                  className={input}
                  name="higherIsBetter"
                  defaultValue={String(metric.higherIsBetter)}
                >
                  <option value="true">Higher is better</option>
                  <option value="false">Lower is better</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-bold">Calculation version</span>
                <input
                  className={input}
                  name="calculationVersion"
                  placeholder="1.0"
                />
              </label>

              <button className="self-end rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                Save KPI governance
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
