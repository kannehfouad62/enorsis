import Link from "next/link";

import {
  getProviderOperationalReadiness,
} from "@/modules/integration-hub/provider-readiness";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProviderReadinessPage() {
  const data =
    await getProviderOperationalReadiness();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
            Production readiness
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Provider Operational Readiness
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Verify the full enterprise provider catalog, native
            adapter availability, configuration state, credential
            readiness, provider health, synchronization evidence and
            certification status before enabling production data flows.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Generated{" "}
            {new Date(
              data.generatedAt,
            ).toLocaleString()}
          </p>
        </div>

        <Link
          href="/app/settings/integration-hub"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
        >
          Integration Hub
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          [
            "Providers",
            data.summary.total,
          ],
          [
            "Configured",
            data.summary.configured,
          ],
          [
            "Operationally ready",
            data.summary.ready,
          ],
          [
            "Certified",
            data.summary.certified,
          ],
          [
            "Customer account required",
            data.summary.customerAccountRequired,
          ],
          [
            "Native adapters",
            data.summary.nativeAdapters,
          ],
          [
            "Healthy",
            data.summary.healthy,
          ],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className={card}
          >
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-5">
        {data.connections.map(
          (connection) => (
            <article
              key={connection.id}
              className={card}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">
                    {connection.provider}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {connection.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {connection.definitionName}
                    {" · "}
                    {connection.environment}
                  </p>
                  {connection.catalogOnly ? (
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      Catalog provider · tenant connection not yet configured
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      connection.certification.passed
                        ? "bg-emerald-100 text-emerald-700"
                        : connection.certification.level ===
                            "CUSTOMER_ACCOUNT_REQUIRED"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {connection.certification.level.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      connection.ready
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {connection.ready
                      ? "OPERATIONALLY READY"
                      : "NOT READY"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Native adapter",
                    connection.adapterRegistered
                      ? "REGISTERED"
                      : "NOT REGISTERED",
                  ],
                  [
                    "Connection",
                    connection.status,
                  ],
                  [
                    "Provider health",
                    connection.healthStatus,
                  ],
                  [
                    "Credentials",
                    `${connection.credentialChecks.filter(
                      (item) =>
                        item.configured &&
                        !item.expired,
                    ).length}/${connection.credentialChecks.length} ready`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Implementation",
                    connection.adapterRegistered
                      ? "READY"
                      : "PENDING",
                  ],
                  [
                    "Health verification",
                    connection.certification.healthVerified
                      ? "PASSED"
                      : "PENDING",
                  ],
                  [
                    "Sync verification",
                    connection.certification.syncVerified
                      ? "PASSED"
                      : "PENDING",
                  ],
                  [
                    "Certification",
                    connection.certification.passed
                      ? "PASSED"
                      : "PENDING",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {connection.certification.externalPrerequisitePending &&
              connection.certification.externalPrerequisite ? (
                <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-sm font-black text-violet-900">
                    External certification prerequisite
                  </p>
                  <p className="mt-2 text-sm leading-6 text-violet-800">
                    {connection.certification.externalPrerequisite}
                  </p>
                  <p className="mt-2 text-xs text-violet-700">
                    The native adapter remains implemented and available.
                    Enorsis will certify the provider when customer-authorized
                    credentials become available.
                  </p>
                </div>
              ) : null}

              {connection.blockers.length ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-black text-rose-900">
                    Blocking conditions
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">
                    {connection.blockers.map(
                      (blocker) => (
                        <li key={blocker}>
                          {blocker}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                  All production-readiness checks currently pass.
                </div>
              )}

              {!connection.catalogOnly &&
              connection.credentialChecks.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="pb-3">
                          Credential
                        </th>
                        <th className="pb-3">
                          Type
                        </th>
                        <th className="pb-3">
                          Secret reference
                        </th>
                        <th className="pb-3">
                          Environment
                        </th>
                        <th className="pb-3">
                          Expiry
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {connection.credentialChecks.map(
                        (credential) => (
                          <tr
                            key={credential.id}
                            className="border-t border-slate-100"
                          >
                            <td className="py-3 font-bold">
                              {credential.name}
                            </td>
                            <td className="py-3">
                              {
                                credential.credentialType
                              }
                            </td>
                            <td className="py-3 font-mono text-xs text-slate-600">
                              {
                                credential.secretReference
                              }
                            </td>
                            <td className="py-3">
                              {credential.configured
                                ? "CONFIGURED"
                                : "MISSING"}
                            </td>
                            <td className="py-3">
                              {credential.expired
                                ? "EXPIRED"
                                : credential.expiresAt
                                  ? new Date(
                                      credential.expiresAt,
                                    ).toLocaleDateString()
                                  : "No expiry"}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Latest sync
                  </p>
                  {connection.latestRun ? (
                    <>
                      <p className="mt-2 font-black text-slate-950">
                        {
                          connection.latestRun
                            .status
                        }
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {
                          connection.latestRun
                            .direction
                        }
                        {" · "}
                        {new Date(
                          connection.latestRun
                            .createdAt,
                        ).toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {
                          connection.latestRun
                            .recordsWritten
                        }{" "}
                        written ·{" "}
                        {
                          connection.latestRun
                            .recordsFailed
                        }{" "}
                        failed
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No sync run has been recorded.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Latest failure
                  </p>
                  {connection.latestFailedRun ? (
                    <>
                      <p className="mt-2 text-sm font-bold text-rose-700">
                        {connection.latestFailedRun
                          .errorMessage ??
                          "Sync failed."}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(
                          connection.latestFailedRun
                            .createdAt,
                        ).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No recent failed sync is recorded.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ),
        )}

        {data.connections.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-slate-500">
              No enterprise provider catalog entries are available.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
