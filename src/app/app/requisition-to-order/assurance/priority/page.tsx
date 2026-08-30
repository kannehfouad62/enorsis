import Link from "next/link";

import {
  getRtoAssurancePriorityQueue,
} from "@/modules/requisition-to-order/assurance-priority-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function priorityClass(priority: string) {
  if (priority === "CRITICAL") {
    return "bg-rose-100 text-rose-700";
  }
  if (priority === "HIGH") {
    return "bg-orange-100 text-orange-700";
  }
  if (priority === "MEDIUM") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

export default async function RtoAssurancePriorityPage() {
  const data = await getRtoAssurancePriorityQueue();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order assurance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Priority Control Queue
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Risk-prioritized procurement journeys ranked by
            unresolved exceptions, overdue demand, approval
            aging, missing order/receipt evidence, and
            payment-readiness gaps.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/sla"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            SLA governance
          </Link>
          <Link
            href="/app/requisition-to-order/assurance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Lifecycle assurance
          </Link>
          <Link
            href="/app/requisition-to-order"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            RTO Command Center
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Journeys", data.summary.total],
          ["Critical", data.summary.critical],
          ["High", data.summary.high],
          ["Medium", data.summary.medium],
          ["Overdue", data.summary.overdue],
          ["With exceptions", data.summary.withExceptions],
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
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Exceptions</th>
                <th className="px-4 py-3">Pending approvals</th>
                <th className="px-4 py-3">PO</th>
                <th className="px-4 py-3">Receipts</th>
                <th className="px-4 py-3">Payment gaps</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.queue.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${priorityClass(
                        item.priority,
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">
                      {item.journeyNumber}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.status}
                      {item.overdue ? " · OVERDUE" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-black">
                    {item.score}
                  </td>
                  <td className="px-4 py-3">
                    {item.activeExceptions}
                  </td>
                  <td className="px-4 py-3">
                    {item.pendingApprovals}
                  </td>
                  <td className="px-4 py-3">
                    {item.poExecutions}
                  </td>
                  <td className="px-4 py-3">
                    {item.receipts}
                  </td>
                  <td className="px-4 py-3">
                    {item.missingPaymentReadiness}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href="/app/requisition-to-order/assurance"
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    >
                      Review controls
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
