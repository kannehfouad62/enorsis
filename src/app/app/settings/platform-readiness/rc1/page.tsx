import Link from "next/link";
import { getRc1Workspace } from "@/modules/platform-readiness/rc1-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function badge(status: string) {
  if (
    status === "READY" ||
    status === "CERTIFIED" ||
    status === "ELIGIBLE"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "BLOCKED") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default async function Rc1Page() {
  const data = await getRc1Workspace();
  const latest = data.latestCertification;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Full Enterprise Release Candidate — RC1
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Final release-candidate evidence across platform
            certification, automation, integrations, governed AI,
            workflows, auditability and enterprise operations.
          </p>
        </div>

        <Link
          href="/app/settings/platform-readiness"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Run / certify platform checks
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        RC1 does not bypass the existing certification workflow.
        This workspace aggregates release evidence; final release
        certification remains controlled by Platform Readiness.
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Release blockers" value={data.blockers} />
        <Metric label="Attention gates" value={data.attention} />
        <Metric label="Active tenants" value={data.activeTenants} />
        <Metric
          label="Certification checks"
          value={
            data.certificationSummary.total || "Not run"
          }
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">
              Release decision
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {latest
                ? latest.releaseBlocked
                  ? "RC1 currently blocked"
                  : latest.certifiedAt
                    ? "RC1 certification evidence available"
                    : "RC1 eligible for certification review"
                : "Run platform certification for RC1"}
            </h2>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-black ${
              latest
                ? latest.releaseBlocked
                  ? badge("BLOCKED")
                  : badge(
                      latest.certifiedAt
                        ? "CERTIFIED"
                        : "ELIGIBLE",
                    )
                : badge("NOT_RUN")
            }`}
          >
            {latest
              ? latest.releaseBlocked
                ? "BLOCKED"
                : latest.certifiedAt
                  ? "CERTIFIED"
                  : "ELIGIBLE"
              : "NOT RUN"}
          </span>
        </div>

        {latest ? (
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric
              label="Passed"
              value={data.certificationSummary.passed}
              compact
            />
            <Metric
              label="Warnings"
              value={data.certificationSummary.warnings}
              compact
            />
            <Metric
              label="Failed"
              value={data.certificationSummary.failed}
              compact
            />
            <Metric
              label="Blocking failures"
              value={data.certificationSummary.blockers}
              compact
            />
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {data.gates.map((gate) => (
          <article key={gate.key} className={card}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black">
                {gate.label}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${badge(
                  gate.status,
                )}`}
              >
                {gate.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {gate.detail}
            </p>
          </article>
        ))}
      </section>

      {latest ? (
        <section className={`${card} mt-8`}>
          <p className="text-xs font-black uppercase text-slate-500">
            Certification evidence
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Release checks and remediation
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Observed</th>
                  <th className="px-4 py-3">
                    Release blocking
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latest.checks.map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-3">
                      <p className="font-black">
                        {check.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {check.category}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {check.status}
                    </td>
                    <td className="px-4 py-3">
                      {check.severity}
                    </td>
                    <td className="px-4 py-3">
                      {check.observedValue ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {check.releaseBlocking ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={`${card} mt-8`}>
        <p className="text-xs font-black uppercase text-blue-700">
          RC1 closure criteria
        </p>
        <h2 className="mt-1 text-2xl font-black">
          Final release gates
        </h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
          <p>
            • Production typecheck and build must complete
            successfully from the release commit.
          </p>
          <p>
            • Prisma migrations must be synchronized with the
            production database.
          </p>
          <p>
            • Platform certification must contain no unresolved
            release-blocking failures.
          </p>
          <p>
            • Security, credentials, connectors and integrations
            must have documented production ownership.
          </p>
          <p>
            • AI recommendations remain governed and human-reviewed
            for controlled procurement actions.
          </p>
          <p>
            • Known warnings must be remediated or explicitly
            accepted before general availability.
          </p>
        </div>
      </section>

      <p className="mt-5 text-xs text-slate-500">
        Evidence evaluated {data.analyzedAt.toLocaleString()}.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "rounded-2xl bg-slate-50 p-4" : card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 font-black ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
