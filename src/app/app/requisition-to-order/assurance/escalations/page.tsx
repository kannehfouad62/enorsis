import Link from "next/link";

import {
  getRtoEscalationAssuranceWorkspace,
} from "@/modules/requisition-to-order/rto-escalation-assurance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function stateClass(state: string) {
  return state === "CRITICAL_BREACH"
    ? "bg-rose-100 text-rose-700"
    : "bg-orange-100 text-orange-700";
}

function deliveryClass(state: string) {
  if (state === "DELIVERED") return "bg-emerald-100 text-emerald-700";
  if (state === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default async function RtoEscalationAssurancePage() {
  const data = await getRtoEscalationAssuranceWorkspace();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            RTO control governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Escalation Management & Assurance
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Governed SLA escalation evidence, recipients, delivery,
            acknowledgment, aging, and critical breach exposure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
                    <Link
            href="/app/requisition-to-order/assurance/executive"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Executive assurance
          </Link>
<Link href="/app/requisition-to-order/assurance/sla"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800">
            SLA workspace
          </Link>
          <Link href="/app/requisition-to-order/assurance"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
            Lifecycle assurance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          ["Escalations", data.summary.total],
          ["Critical", data.summary.critical],
          ["Delivered", data.summary.delivered],
          ["Delivery failures", data.summary.deliveryFailures],
          ["Acknowledged", data.summary.acknowledged],
          ["Unacknowledged", data.summary.unacknowledged],
          ["Avg. age", `${data.summary.averageAgeHours.toFixed(1)}h`],
        ].map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
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
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Notification</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Acknowledgment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => {
                const deliveryState =
                  item.failed > 0
                    ? "FAILED"
                    : item.delivered > 0
                      ? "DELIVERED"
                      : "PENDING";
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${stateClass(item.slaState)}`}>
                        {item.slaState.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{item.type}</td>
                    <td className="px-4 py-3 font-black">{item.journeyNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.recipientAddress ?? item.recipientUserId ?? "UNASSIGNED"}
                    </td>
                    <td className="px-4 py-3 font-black">
                      {item.ageHours === null ? "—" : `${item.ageHours.toFixed(1)}h`}
                    </td>
                    <td className="px-4 py-3">{item.notificationStatus}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${deliveryClass(deliveryState)}`}>
                        {deliveryState}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.delivered} delivered · {item.failed} failed · {item.pending} pending
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.acknowledgedAt
                        ? item.acknowledgedAt.toLocaleString()
                        : "UNACKNOWLEDGED"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No governed RTO SLA escalations have been recorded for this tenant.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black text-slate-950">Escalation evidence</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Acknowledgment is derived from the enterprise notification read timestamp.
          Resolution remains governed by the underlying approval or exception lifecycle.
        </p>
        <div className="mt-5 space-y-4">
          {data.items.slice(0, 50).map((item) => (
            <article key={`evidence:${item.id}`}
              className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                </div>
                <p className="text-xs font-bold text-slate-400">
                  {item.createdAt.toLocaleString()}
                </p>
              </div>
              {item.errorMessage ? (
                <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {item.errorMessage}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.deliveries.map((delivery) => (
                  <span key={delivery.id}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {delivery.channel} · {delivery.status} · {delivery.attemptCount}/{delivery.maxAttempts}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
