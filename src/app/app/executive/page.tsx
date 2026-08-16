import Link from "next/link";
import { ExecutiveDomainScorecards } from "@/components/executive-dashboard/domain-scorecards";
import { ExecutiveKpiGrid } from "@/components/executive-dashboard/kpi-grid";
import { ExecutiveRiskWatchlist } from "@/components/executive-dashboard/risk-watchlist";
import { getExecutiveDashboardWorkspace } from "@/modules/executive-dashboard/queries";

const panel =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveDashboardWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Executive Intelligence Workspace
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Enterprise health, KPI performance, operational risk and governed
            drill-down access across inventory and warehouse operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/executive/kpis"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            KPI Engine
          </Link>
          <Link
            href="/app/executive/analytics-foundation"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            Analytics Foundation
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={panel}>
          <p className="text-xs font-black uppercase text-slate-500">
            Enterprise Health
          </p>
          <p className="mt-3 text-5xl font-black">
            {data.score.enterpriseHealthScore}
          </p>
          <p className="mt-2 text-sm text-slate-500">out of 100</p>
        </article>

        <article className={panel}>
          <p className="text-xs font-black uppercase text-slate-500">
            Governed KPIs
          </p>
          <p className="mt-3 text-5xl font-black">{data.score.totalMetrics}</p>
        </article>

        <article className={panel}>
          <p className="text-xs font-black uppercase text-slate-500">
            Critical KPIs
          </p>
          <p className="mt-3 text-5xl font-black">
            {data.score.criticalMetrics}
          </p>
        </article>

        <article className={panel}>
          <p className="text-xs font-black uppercase text-slate-500">
            Warning KPIs
          </p>
          <p className="mt-3 text-5xl font-black">
            {data.score.warningMetrics}
          </p>
        </article>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-2xl font-black">Domain health</h2>
          <p className="mt-1 text-sm text-slate-500">
            Consolidated health scores from governed KPI states.
          </p>
        </div>
        <ExecutiveDomainScorecards domains={data.score.domains} />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Executive KPI cockpit</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest enterprise KPI values with target and trend context.
            </p>
          </div>
          <Link
            href="/app/executive/kpis"
            className="text-sm font-black text-blue-700"
          >
            Configure KPI governance →
          </Link>
        </div>
        <ExecutiveKpiGrid cards={data.cards} />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className={panel}>
          <h2 className="text-xl font-black">Risk watchlist</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest warning and critical KPI states.
          </p>
          <div className="mt-5">
            <ExecutiveRiskWatchlist items={data.criticalMetrics} />
          </div>
        </section>

        <section className={panel}>
          <h2 className="text-xl font-black">Analytics operations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Recent governed aggregation executions.
          </p>

          <div className="mt-5 space-y-3">
            {data.recentRuns.map((run) => (
              <article key={run.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black">{run.runNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">{run.scope}</p>
                  </div>
                  <span className="text-xs font-black">{run.status}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {run.metricsCalculated}/{run.metricsRequested} metrics ·{" "}
                  {run.failureCount} failures · {run.warningCount} warnings
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className={`${panel} mt-8`}>
        <h2 className="text-xl font-black">Operational drill-down</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["/app/inventory-operations", "Inventory Operations"],
            ["/app/warehouse-operations", "Warehouse Receiving"],
            ["/app/warehouse-fulfillment", "Warehouse Fulfillment"],
            ["/app/inventory-reconciliation", "Inventory Reconciliation"],
            ["/app/inventory-traceability", "Inventory Traceability"],
            ["/app/replenishment", "Replenishment & Transfers"],
            ["/app/inventory-financial-valuation", "Financial Valuation"],
            ["/app/executive/kpis", "Enterprise KPI Engine"],
            ["/app/executive/ai-intelligence", "Governed Executive AI"],
            ["/app/executive/ai-briefing", "Executive AI Briefing"],
            ["/app/executive/board-reporting", "Executive Board Reporting"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-slate-50 p-4 text-sm font-black transition hover:bg-slate-100"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
