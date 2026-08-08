import Link from "next/link";
import {
  getConnectorObservabilityWorkspace,
} from "@/modules/enterprise-automation/connector-observability-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ConnectorObservabilityPage() {
  const data = await getConnectorObservabilityWorkspace();

  const healthy = data.connectors.filter(
    (connector) => connector.health === "HEALTHY",
  ).length;
  const attention = data.connectors.filter((connector) =>
    ["WARNING", "DEGRADED"].includes(connector.health),
  ).length;
  const openCircuits = data.connectors.filter(
    (connector) => connector.circuitState === "OPEN",
  ).length;
  const recoveryReady = data.connectors.filter(
    (connector) => connector.circuitState === "RECOVERY_READY",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.9.2.11
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Connector Observability
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Operational health, policy enforcement, circuit-breaker resilience,
            recovery readiness and governed execution history.
          </p>
        </div>

        <Link
          href="/app/automation/connectors"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Connector Registry
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">Connectors</p>
          <p className="mt-2 text-3xl font-black">{data.connectors.length}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">Healthy</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{healthy}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">Attention</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{attention}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">Open circuits</p>
          <p className="mt-2 text-3xl font-black text-red-700">{openCircuits}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">Recovery ready</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{recoveryReady}</p>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        {data.connectors.map((connector) => (
          <article key={connector.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {connector.health} · {connector.status}
                </p>
                <h2 className="mt-1 text-xl font-black">{connector.name}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {connector.connectorKey}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>
                  Success rate:{" "}
                  {connector.successRate === null
                    ? "—"
                    : `${connector.successRate}%`}
                </p>
                <p className="mt-1">Failures: {connector.failureCount}</p>
                <p className="mt-1">
                  Consecutive: {connector.consecutiveFailures}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Usage</p>
                <p className="mt-1 text-slate-500">{connector.usageCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Successes</p>
                <p className="mt-1 text-slate-500">{connector.successCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Policy</p>
                <p className="mt-1 text-slate-500">
                  {connector.policyTag ?? "Default"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Daily limit</p>
                <p className="mt-1 text-slate-500">
                  {connector.maxDailyExecutions ?? "Unlimited"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Circuit</p>
                <p className="mt-1 text-slate-500">{connector.circuitState}</p>
                {connector.circuitState === "OPEN" &&
                connector.circuitRetryAt ? (
                  <p className="mt-1 text-red-700">
                    Retry after {connector.circuitRetryAt.toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>

            {connector.lastFailureMessage ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                {connector.lastFailureMessage}
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Recent audit activity
              </p>
              <div className="mt-3 space-y-2">
                {connector.audits.map((audit) => (
                  <div key={audit.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-black">{audit.type}</p>
                      <p className="text-slate-500">
                        {audit.createdAt.toLocaleString()}
                      </p>
                    </div>
                    {audit.message ? (
                      <p className="mt-1 text-slate-600">{audit.message}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
