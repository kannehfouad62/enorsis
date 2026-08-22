import Link from "next/link";

import {
  ExceptionAgingChart,
  ReconciliationClassificationChart,
  ReconciliationTrendChart,
  StatementImportPerformanceChart,
} from "./charts";
import { getReconciliationAnalytics } from "@/modules/reconciliation-analytics/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function ReconciliationAnalyticsPage() {
  const data = await getReconciliationAnalytics();

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Treasury intelligence
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Reconciliation Analytics
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Monitor reconciliation effectiveness, exception exposure,
            close readiness, operational aging, and statement-import
            quality across the buyer organization.
          </p>
        </div>

        <Link
          href="/app/requisition-to-order/reconciliation"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
        >
          Back to reconciliation
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Reconciliation rate",
            percent(data.summary.reconciliationRate),
            `${data.summary.reconciledCount} of ${data.summary.eligibleCount}`,
          ],
          [
            "Automatic match rate",
            percent(data.summary.autoMatchRate),
            "Exact-reference reconciliations",
          ],
          [
            "Open exceptions",
            String(data.summary.openExceptionCount),
            money(data.summary.openExceptionValue),
          ],
          [
            "Close readiness",
            data.summary.closeReady ? "READY" : "BLOCKED",
            data.summary.closeReady
              ? "No material blockers"
              : `${data.summary.materialOpenCount} material · ${data.summary.pendingApprovalCount} approvals`,
          ],
        ].map(([label, value, detail]) => (
          <div key={label} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {value}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {detail}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={card}>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Unreconciled exposure
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {money(data.summary.unreconciledValue)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {data.summary.unreconciledCount} executed or completed
            payment run(s) still awaiting reconciliation.
          </p>
        </div>

        <div className={card}>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Duplicate exposure
          </p>
          <p className="mt-2 text-3xl font-black text-rose-700">
            {money(data.summary.duplicateExposure)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Unresolved duplicate settlement value requiring treasury
            attention.
          </p>
        </div>

        <div className={card}>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Governance backlog
          </p>
          <p className="mt-2 text-3xl font-black text-violet-700">
            {data.summary.pendingApprovalCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {data.summary.overdueGovernanceCount} governed case(s)
            overdue against assigned due dates.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Reconciliation classification
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Distribution of matched, partial, unmatched, duplicate, and
            still-unreconciled payment activity.
          </p>
          <ReconciliationClassificationChart
            data={data.classificationData}
          />
        </div>

        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Exception aging
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Open reconciliation exceptions grouped by operational age.
          </p>
          <ExceptionAgingChart data={data.agingData} />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          12-month reconciliation trend
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Monthly reconciliation throughput, matched activity, and
          exception creation.
        </p>
        <ReconciliationTrendChart data={data.monthlyData} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Bank statement import performance
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Matched versus exception rows across the most recent statement
          imports.
        </p>
        <StatementImportPerformanceChart
          data={data.importPerformance}
        />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Material exception watchlist
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Highest-value unresolved material or duplicate
              reconciliation exceptions.
            </p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            {data.summary.materialOpenCount} material
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Statement</th>
                <th className="pb-3">Class</th>
                <th className="pb-3">Resolution</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.materialExceptions.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100"
                >
                  <td className="py-4 font-black text-slate-950">
                    {item.statementReference}
                  </td>
                  <td className="py-4">{item.status}</td>
                  <td className="py-4">{item.resolutionStatus}</td>
                  <td className="py-4">
                    {item.reconciliationDate.toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right font-black text-rose-700">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: item.currencyCode,
                    }).format(item.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.materialExceptions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No material reconciliation exceptions are open.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Treasury close intelligence
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Exception resolution rate
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {percent(data.summary.exceptionResolutionRate)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Material blockers
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {data.summary.materialOpenCount}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Latest close
            </p>
            <p className="mt-2 text-lg font-black text-slate-950">
              {data.summary.latestClose
                ? `${data.summary.latestClose.periodStart.toLocaleDateString()} – ${data.summary.latestClose.periodEnd.toLocaleDateString()}`
                : "No period closed yet"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
