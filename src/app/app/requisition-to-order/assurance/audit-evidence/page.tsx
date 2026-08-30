import Link from "next/link";

import {
  getRtoAuditEvidence,
} from "@/modules/requisition-to-order/rto-audit-evidence-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function RtoAuditEvidencePage() {
  const data = await getRtoAuditEvidence();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Audit Evidence & Export
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Tenant-scoped audit evidence across RTO journeys,
            approvals, milestones, governed exceptions, downstream
            procurement evidence, SLA escalations, notification
            delivery, and enterprise activity history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/policies"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Policy governance
          </Link>
          <a
            href="/api/requisition-to-order/audit-evidence?format=json"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Export JSON
          </a>
          <a
            href="/api/requisition-to-order/audit-evidence?format=csv"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Export CSV
          </a>
          <Link
            href="/app/requisition-to-order/assurance/executive"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Executive assurance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Journeys", data.totals.journeys],
          ["Exceptions", data.totals.exceptions],
          ["Milestones", data.totals.milestones],
          ["Escalations", data.totals.escalations],
          ["Activities", data.totals.activities],
        ].map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className={`${card} mt-6`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Correlation</th>
                <th className="px-4 py-3">Approvals</th>
                <th className="px-4 py-3">Exceptions</th>
                <th className="px-4 py-3">Milestones</th>
                <th className="px-4 py-3">PO / Receipt / Match</th>
                <th className="px-4 py-3">Escalations</th>
                <th className="px-4 py-3">Activities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.journeys.map((journey) => (
                <tr key={journey.id}>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">
                      {journey.journeyNumber}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {journey.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {journey.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {journey.correlationId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {journey.approvals.decisions}
                  </td>
                  <td className="px-4 py-3">
                    {journey.exceptions.length}
                  </td>
                  <td className="px-4 py-3">
                    {journey.milestones.length}
                  </td>
                  <td className="px-4 py-3">
                    {journey.downstream.purchaseOrders} /{" "}
                    {journey.downstream.receipts} /{" "}
                    {journey.downstream.threeWayMatches}
                  </td>
                  <td className="px-4 py-3">
                    {journey.escalations.length}
                  </td>
                  <td className="px-4 py-3">
                    {journey.activities.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!data.journeys.length ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No RTO audit evidence is available for this tenant.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
