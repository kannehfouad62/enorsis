import Link from "next/link";

import {
  initializeRtoPolicyCatalogAction,
  setRtoTenantPolicyOverrideAction,
} from "@/modules/requisition-to-order/rto-policy-actions";
import {
  getRtoPolicyGovernance,
} from "@/modules/requisition-to-order/rto-policy-governance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function RtoPolicyGovernancePage() {
  const data = await getRtoPolicyGovernance();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Policy & Configuration Governance
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Govern RTO SLA thresholds through platform defaults
            and tenant-scoped overrides while preserving explicit
            effective values and configuration provenance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/certification"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Production certification
          </Link>
          <form action={initializeRtoPolicyCatalogAction}>
            <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
              Initialize RTO policies
            </button>
          </form>
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
          ["Policies", data.summary.total],
          ["Initialized", data.summary.initialized],
          ["Tenant overrides", data.summary.tenantOverrides],
          ["Code defaults", data.summary.codeDefaults],
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
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">Override</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Tenant override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.policies.map((policy) => (
                <tr key={policy.key}>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">
                      {policy.key}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {policy.definitionStatus}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {policy.source}
                  </td>
                  <td className="px-4 py-3">
                    {policy.defaultValue}h
                  </td>
                  <td className="px-4 py-3">
                    {policy.overrideValue === null
                      ? "—"
                      : `${policy.overrideValue}h`}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {policy.effectiveValue}h
                  </td>
                  <td className="px-4 py-3">
                    {policy.definitionId ? (
                      <form
                        action={
                          setRtoTenantPolicyOverrideAction
                        }
                        className="flex gap-2"
                      >
                        <input
                          type="hidden"
                          name="definitionId"
                          value={policy.definitionId}
                        />
                        <input
                          name="value"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={
                            policy.overrideValue ??
                            policy.effectiveValue
                          }
                          className="w-24 rounded-lg border border-slate-200 px-3 py-2"
                        />
                        <button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Initialize first
                      </span>
                    )}
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
