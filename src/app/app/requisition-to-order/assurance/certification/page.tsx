import Link from "next/link";

import {
  getRtoProductionCertification,
} from "@/modules/requisition-to-order/rto-production-certification";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function gateClass(status: string) {
  if (status === "BLOCKED") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "WARNING") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

function readinessClass(status: string) {
  if (status === "BLOCKED") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "READY_WITH_WARNINGS") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

export default async function RtoProductionCertificationPage() {
  const data =
    await getRtoProductionCertification();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Production Certification & Release Readiness
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Evidence-based release gate across control health,
            SLA performance, exception exposure, escalation
            delivery, audit evidence, policy governance, and
            operational risk.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-black text-slate-600">
              Certification state
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${readinessClass(
                data.readiness,
              )}`}
            >
              {data.readiness.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/certification/remediation"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Resolve warnings
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/policies"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Policy governance
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/audit-evidence"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Audit evidence
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/executive"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Executive assurance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Certification gates", data.summary.total],
          ["Passed", data.summary.passed],
          ["Warnings", data.summary.warnings],
          ["Blocked", data.summary.blocked],
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
                <th className="px-4 py-3">Gate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Release blocker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.gates.map((gate) => (
                <tr key={gate.key}>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">
                      {gate.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {gate.key}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${gateClass(
                        gate.status,
                      )}`}
                    >
                      {gate.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {gate.evidence}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {gate.blocker ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.summary.blocked > 0 ? (
        <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="text-xl font-black text-rose-900">
            Release blockers remain
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">
            RTO should not be declared production-certified
            until every blocker above is cleared.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-black text-emerald-900">
            No hard release blockers detected
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            The current RTO control evidence supports the
            displayed readiness state. Warnings should still
            be reviewed before formal release approval.
          </p>
        </section>
      )}
    </main>
  );
}
