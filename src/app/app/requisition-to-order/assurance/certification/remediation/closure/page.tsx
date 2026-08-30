import Link from "next/link";

import {
  getRtoCancellationCandidates,
} from "@/modules/requisition-to-order/rto-cancellation-candidates";
import {
  cancelTestJourneyAction,
  extendRequiredByDateAction,
} from "@/modules/requisition-to-order/release-remediation-actions";
import {
  getRtoReleaseWarningRemediation,
} from "@/modules/requisition-to-order/rto-release-warning-remediation";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function RtoCertificationClosurePage() {
  const [data, cancellationCandidates] =
    await Promise.all([
      getRtoReleaseWarningRemediation(),
      getRtoCancellationCandidates(),
    ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Governed release remediation
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Certification Closure
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Resolve stale approval state, cancel test/demo
            journeys, or govern overdue demand dates without
            deleting audit history.
          </p>
        </div>

        <Link
          href="/app/requisition-to-order/assurance/certification"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
        >
          Re-evaluate certification
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black text-slate-950">
          Approval reconciliation review
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Stale approvals are not auto-approved here. Complete
          or reassign the real approval through the operational
          workspace to preserve authority and separation of duties.
        </p>

        <div className="mt-4 space-y-3">
          {data.slaWarnings
            .filter((item) => item.type === "APPROVAL")
            .map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="font-black">
                  {item.journeyNumber} — {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.state.replaceAll("_", " ")} ·{" "}
                  {item.ageHours.toFixed(1)}h
                </p>
                <Link
                  href="/app/requisition-to-order"
                  className="mt-3 inline-block rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
                >
                  Complete or reassign approval
                </Link>
              </div>
            ))}

          {!data.slaWarnings.some(
            (item) => item.type === "APPROVAL",
          ) ? (
            <p className="text-sm text-slate-500">
              No stale approval items remain.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black text-slate-950">
          Cancel test / demo journeys
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This list is independent of overdue and SLA status.
          Use it only for test/demo transactions that should
          remain in audit history but no longer participate in
          active procurement controls.
        </p>

        <div className="mt-5 space-y-4">
          {cancellationCandidates.map((item) => (
            <form
              key={item.id}
              action={cancelTestJourneyAction}
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <input
                type="hidden"
                name="journeyId"
                value={item.id}
              />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-rose-950">
                    {item.journeyNumber} — {item.title}
                  </p>
                  <p className="mt-1 text-sm text-rose-700">
                    {item.status}
                    {item.requiredByDate
                      ? ` · Required ${item.requiredByDate.toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_260px_auto]">
                <input
                  name="reason"
                  required
                  minLength={10}
                  defaultValue="Test transaction - no longer required"
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2"
                />
                <input
                  name="confirmation"
                  required
                  placeholder="CANCEL TEST JOURNEY"
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2"
                />
                <button className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white">
                  Cancel test journey
                </button>
              </div>
            </form>
          ))}

          {!cancellationCandidates.length ? (
            <p className="text-sm text-slate-500">
              No active RTO journeys are eligible for cancellation.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black text-slate-950">
          Overdue required-by dates
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Extend only when the business requirement remains valid.
        </p>

        <div className="mt-5 space-y-4">
          {data.overdueJourneys.map((item) => (
            <form
              key={item.id}
              action={extendRequiredByDateAction}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <input
                type="hidden"
                name="journeyId"
                value={item.id}
              />
              <p className="font-black text-slate-950">
                {item.journeyNumber} — {item.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {item.status} · {item.priority} · risk score{" "}
                {item.score}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                <input
                  name="requiredByDate"
                  type="date"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
                <input
                  name="reason"
                  required
                  minLength={10}
                  placeholder="Business reason for extending required-by date"
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
                  Extend date
                </button>
              </div>
            </form>
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
