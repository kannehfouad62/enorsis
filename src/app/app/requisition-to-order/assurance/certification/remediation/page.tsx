import Link from "next/link";

import {
  getRtoReleaseWarningRemediation,
} from "@/modules/requisition-to-order/rto-release-warning-remediation";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function stateClass(state: string) {
  if (state === "CRITICAL_BREACH") {
    return "bg-rose-100 text-rose-700";
  }
  if (state === "BREACHED") {
    return "bg-orange-100 text-orange-700";
  }
  return "bg-amber-100 text-amber-700";
}

export default async function RtoReleaseWarningRemediationPage() {
  const data =
    await getRtoReleaseWarningRemediation();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            RTO release hardening
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Release Warning Remediation
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Resolve the remaining nonblocking certification
            warnings before formal production approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/certification/remediation/closure"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Governed closure
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/certification"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Production certification
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/sla"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            SLA governance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Remediation items", data.summary.totalRemediationItems],
          ["SLA warnings", data.summary.slaWarnings],
          ["Breached", data.summary.breached],
          ["Critical breach", data.summary.criticalBreaches],
          ["Overdue journeys", data.summary.overdueJourneys],
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
        <h2 className="text-xl font-black text-slate-950">
          SLA remediation queue
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Remediation</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.slaWarnings.map((item) => (
                <tr key={item.key}>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${stateClass(
                        item.state,
                      )}`}
                    >
                      {item.state.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {item.type}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">
                      {item.journeyNumber}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {item.title}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-black">
                    {item.ageHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.ownerUserId ?? "UNASSIGNED"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.guidance}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={item.remediationUrl}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    >
                      Open workspace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!data.slaWarnings.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No SLA warning or breach items remain.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black text-slate-950">
          Overdue journey remediation
        </h2>
        <div className="mt-5 space-y-3">
          {data.overdueJourneys.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">
                    {item.journeyNumber} — {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.status} · {item.priority} · risk score {item.score}
                  </p>
                </div>
                <Link
                  href={item.remediationUrl}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                >
                  Review journey
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.guidance}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Open exceptions: {item.activeExceptions} · Pending approvals:{" "}
                {item.pendingApprovals} · Payment gaps:{" "}
                {item.missingPaymentReadiness}
              </p>
            </div>
          ))}

          {!data.overdueJourneys.length ? (
            <p className="text-sm text-slate-500">
              No overdue journeys remain.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
