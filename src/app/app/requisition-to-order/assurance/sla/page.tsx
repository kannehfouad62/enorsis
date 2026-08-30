import Link from "next/link";

import {
  getRtoSlaWorkspace,
} from "@/modules/requisition-to-order/rto-sla-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function stateClass(state: string) {
  if (state === "CRITICAL_BREACH") {
    return "bg-rose-100 text-rose-700";
  }
  if (state === "BREACHED") {
    return "bg-orange-100 text-orange-700";
  }
  if (state === "WARNING") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

export default async function RtoSlaPage() {
  const data = await getRtoSlaWorkspace();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            RTO control governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            SLA & Escalation Governance
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Monitor aging approval decisions and governed
            exceptions against explicit control thresholds,
            ownership, and escalation severity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/escalations"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Escalation assurance
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/priority"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Priority queue
          </Link>
          <Link
            href="/app/requisition-to-order/assurance"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Lifecycle assurance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          ["Items", data.summary.total],
          ["Critical breach", data.summary.criticalBreaches],
          ["Breached", data.summary.breached],
          ["Warning", data.summary.warning],
          ["On track", data.summary.onTrack],
          ["Unowned", data.summary.unowned],
          ["Open exceptions", data.summary.openExceptions],
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
                <th className="px-4 py-3">SLA state</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <tr key={`${item.type}:${item.id}`}>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${stateClass(
                        item.status,
                      )}`}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {item.type}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {item.journeyNumber}
                  </td>
                  <td className="px-4 py-3">
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    {item.severity ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {item.ageHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.ownerUserId ?? "UNASSIGNED"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href="/app/requisition-to-order/assurance"
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    >
                      Open control
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
