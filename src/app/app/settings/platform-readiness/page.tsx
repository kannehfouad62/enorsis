import {
  certifyPlatformReleaseAction,
  runPlatformCertificationAction,
} from "@/modules/platform-readiness/actions";
import { getPlatformReadinessWorkspace } from "@/modules/platform-readiness/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlatformReadinessPage() {
  const data = await getPlatformReadinessWorkspace();
  const latest = data.runs[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Release Hardening & Platform Certification
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Execute release-blocking platform checks, review evidence and
        remediation, and certify a foundation release only when critical
        controls pass.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Run certification</h2>
        <form
          action={runPlatformCertificationAction}
          className="mt-5 grid gap-4 md:grid-cols-3"
        >
          <Field
            name="name"
            label="Certification name"
            value="Enterprise Foundation 1.0 Certification"
            required
          />
          <Field name="releaseVersion" label="Release version" value="1.0.0" />
          <Field name="environment" label="Environment" value="PRODUCTION" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Run readiness checks
          </button>
        </form>
      </section>

      {latest ? (
        <section className={`${card} mt-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Latest certification
              </p>
              <h2 className="mt-2 text-2xl font-black">{latest.name}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {latest.environment} · {latest.releaseVersion ?? "Unversioned"} ·{" "}
                {latest.status}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${
                latest.releaseBlocked
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {latest.releaseBlocked ? "RELEASE BLOCKED" : "RELEASE ELIGIBLE"}
            </span>
          </div>

          {!latest.releaseBlocked &&
          !latest.certifiedAt &&
          latest.status !== "RUNNING" ? (
            <form action={certifyPlatformReleaseAction} className="mt-5">
              <input
                type="hidden"
                name="certificationRunId"
                value={latest.id}
              />
              <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
                Certify release
              </button>
            </form>
          ) : null}

          {latest.certifiedAt ? (
            <p className="mt-5 font-bold text-emerald-700">
              Certified on {latest.certifiedAt.toLocaleString()}
            </p>
          ) : null}

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Observed</th>
                  <th className="px-4 py-3">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latest.checks.map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-3">
                      <p className="font-black">{check.name}</p>
                      <p className="text-xs text-slate-500">
                        {check.category} · {check.key}
                      </p>
                    </td>
                    <td className="px-4 py-3">{check.status}</td>
                    <td className="px-4 py-3">{check.severity}</td>
                    <td className="px-4 py-3">
                      {check.observedValue ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {check.remediation ?? "None required"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Certification history</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.runs.map((run) => (
            <article key={run.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{run.status}</p>
              <h3 className="mt-2 font-black">{run.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {run.checks.length} checks ·{" "}
                {run.createdAt.toLocaleString()}
              </p>
              <p className="mt-3 text-sm font-bold">
                {run.releaseBlocked ? "Release blocked" : "Release eligible"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  value,
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input
        className={input}
        name={name}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
