import { runEnterpriseAnalyticsAggregationAction } from "@/modules/enterprise-analytics/actions";
import { getEnterpriseAnalyticsFoundationWorkspace } from "@/modules/enterprise-analytics/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AnalyticsFoundationPage() {
  const data = await getEnterpriseAnalyticsFoundationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.1.1
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise Analytics Foundation
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Governed KPI definitions, historical snapshots, aggregation runs,
            calculation provenance and reusable analytics infrastructure.
          </p>
        </div>

        <form action={runEnterpriseAnalyticsAggregationAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Refresh analytics
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.latestSnapshots.map((snapshot) => (
          <article key={snapshot.id} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {snapshot.metricDefinition.domain}
            </p>
            <h2 className="mt-2 text-sm font-bold">
              {snapshot.metricDefinition.name}
            </h2>
            <p className="mt-3 text-3xl font-black">
              {snapshot.numericValue.toString()}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {snapshot.healthStatus} · {snapshot.trendDirection} ·{" "}
              {snapshot.sourceRecordCount} source records
            </p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Metric registry</h2>
          <div className="mt-5 space-y-3">
            {data.definitions.map((definition) => (
              <div key={definition.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{definition.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {definition.metricKey} · {definition.metricType} ·{" "}
                  {definition.calculationVersion}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Aggregation runs</h2>
          <div className="mt-5 space-y-3">
            {data.runs.map((run) => (
              <article key={run.id} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black text-blue-700">{run.status}</p>
                <p className="mt-1 font-black">{run.runNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.metricsCalculated}/{run.metricsRequested} calculated ·{" "}
                  {run.failureCount} failures · {run.warningCount} warnings
                </p>
                {run.failures.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {run.failures.map((failure) => (
                      <p key={failure.id} className="text-xs text-red-700">
                        {failure.metricKey ?? "Unknown metric"} —{" "}
                        {failure.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
