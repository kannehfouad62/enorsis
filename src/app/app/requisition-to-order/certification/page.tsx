import {
  certifyProcurementProcessAction,
  runProcurementProcessCertificationAction,
} from "@/modules/requisition-to-order/certification-actions";
import { getProcurementCertificationWorkspace } from "@/modules/requisition-to-order/certification-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementCertificationPage() {
  const data = await getProcurementCertificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B1.9
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Requisition-to-Payment Process Certification
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Run process certification</h2>
        <form
          action={runProcurementProcessCertificationAction}
          className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]"
        >
          <label>
            <span className="text-sm font-bold">Procurement journey</span>
            <select className={input} name="journeyId" required>
              <option value="">Select journey</option>
              {data.journeys.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.journeyNumber} — {journey.title} — {journey.status}
                </option>
              ))}
            </select>
          </label>
          <button className="self-end rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Run certification
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Certification history</h2>
        <div className="mt-5 space-y-5">
          {data.certifications.map((certification) => (
            <article
              key={certification.id}
              className="rounded-2xl bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-blue-700">
                    {certification.status}
                  </p>
                  <h3 className="mt-2 text-lg font-black">
                    {certification.certificationNumber}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {certification.journey.journeyNumber} —{" "}
                    {certification.journey.title}
                  </p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    certification.releaseBlocked
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {certification.releaseBlocked
                    ? "CLOSURE BLOCKED"
                    : "CLOSURE ELIGIBLE"}
                </span>
              </div>

              {!certification.releaseBlocked &&
              certification.status !== "CERTIFIED" ? (
                <form
                  action={certifyProcurementProcessAction}
                  className="mt-4"
                >
                  <input
                    type="hidden"
                    name="certificationId"
                    value={certification.id}
                  />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Certify & close journey
                  </button>
                </form>
              ) : null}

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Control</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Observed</th>
                      <th className="px-3 py-2">Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {certification.checks.map((check) => (
                      <tr key={check.id}>
                        <td className="px-3 py-2">
                          <p className="font-black">{check.name}</p>
                          <p className="text-xs text-slate-500">
                            {check.category}
                          </p>
                        </td>
                        <td className="px-3 py-2">{check.status}</td>
                        <td className="px-3 py-2">{check.severity}</td>
                        <td className="px-3 py-2">
                          {check.observedValue ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {check.remediation ?? "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
