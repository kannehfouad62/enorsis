import Link from "next/link";

import {
  promoteAssuranceFindingAction,
  updateJourneyExceptionAction,
} from "@/modules/requisition-to-order/actions";

import {
  getRequisitionLifecycleAssurance,
} from "@/modules/requisition-to-order/lifecycle-assurance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function badge(status: string) {
  if (status === "ASSURED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "ATTENTION") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "AT_RISK") {
    return "bg-orange-100 text-orange-700";
  }
  return "bg-rose-100 text-rose-700";
}

export default async function LifecycleAssurancePage() {
  const data = await getRequisitionLifecycleAssurance();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order assurance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Lifecycle Assurance
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Reconcile journey status with real approval,
            purchase-order, receipt, three-way-match,
            payment-readiness and exception evidence.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Generated{" "}
            {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>

        <Link
          href="/app/requisition-to-order/assurance/priority"
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
        >
          Priority control queue
        </Link>

        <Link
          href="/app/requisition-to-order"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
        >
          RTO Command Center
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          ["Journeys", data.summary.total],
          ["Assured", data.summary.assured],
          ["Attention", data.summary.attention],
          ["At risk", data.summary.atRisk],
          ["Critical", data.summary.critical],
          ["Overdue", data.summary.overdue],
          ["Open findings", data.summary.openFindings],
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

      <section className="mt-6 space-y-5">
        {data.journeys.map((journey) => (
          <article key={journey.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  {journey.status}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {journey.journeyNumber} — {journey.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {journey.currencyCode}{" "}
                  {journey.estimatedAmount?.toString() ?? "0.00"}
                  {journey.requiredByDate
                    ? ` · Required ${journey.requiredByDate.toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${badge(
                  journey.assuranceStatus,
                )}`}
              >
                {journey.assuranceStatus.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {[
                ["Approval routes", journey.evidence.approvalRoutes],
                ["Approval decisions", journey.evidence.approvalDecisions],
                ["Pending approvals", journey.evidence.pendingApprovals],
                ["PO executions", journey.evidence.purchaseOrders],
                ["Receipts", journey.evidence.receipts],
                ["3-way matches", journey.evidence.threeWayMatches],
                ["Payment readiness", journey.evidence.paymentReadinessCases],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {journey.activeExceptions.length ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  Governed exceptions
                </p>
                <div className="mt-3 space-y-3">
                  {journey.activeExceptions.map(
                    (exception) => (
                      <form
                        key={exception.id}
                        action={
                          updateJourneyExceptionAction
                        }
                        className="grid gap-3 rounded-xl bg-white p-4 md:grid-cols-5"
                      >
                        <input
                          type="hidden"
                          name="exceptionId"
                          value={exception.id}
                        />
                        <div>
                          <p className="text-xs font-black text-slate-500">
                            {exception.code}
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {exception.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {exception.severity}
                            {" · "}
                            {exception.status}
                          </p>
                        </div>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Status
                          </span>
                          <select
                            name="status"
                            defaultValue={
                              exception.status
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <option>OPEN</option>
                            <option>INVESTIGATING</option>
                            <option>RESOLVED</option>
                          </select>
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Owner user ID
                          </span>
                          <input
                            name="ownerUserId"
                            defaultValue={
                              exception.ownerUserId ??
                              ""
                            }
                            placeholder="Optional"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Resolution / investigation note
                          </span>
                          <input
                            name="note"
                            placeholder="Add evidence or note"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>

                        <div className="flex items-end">
                          <button className="w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                            Update exception
                          </button>
                        </div>
                      </form>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {journey.findings.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Control finding</th>
                      <th className="px-4 py-3">Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journey.findings.map((finding) => (
                      <tr key={finding.code}>
                        <td className="px-4 py-3 font-black">
                          {finding.severity}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900">
                            {finding.code}
                          </p>
                          <p className="mt-1 text-slate-600">
                            {finding.message}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={finding.actionUrl}
                            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-slate-200"
                          >
                            Open workspace
                          </Link>
                              <form
                                action={
                                  promoteAssuranceFindingAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="journeyId"
                                  value={journey.id}
                                />
                                <input
                                  type="hidden"
                                  name="code"
                                  value={finding.code}
                                />
                                <button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                                  Govern finding
                                </button>
                              </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                Lifecycle evidence is consistent with the recorded journey state.
              </div>
            )}
          </article>
        ))}

        {!data.journeys.length ? (
          <div className={card}>
            <p className="text-sm text-slate-500">
              No requisition-to-order journeys are available for assurance.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
