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
  const slaBreaches = data.connectors.filter(
    (connector) => connector.slaStatus === "BREACHED",
  ).length;
  const policyConstrained = data.connectors.filter(
    (connector) => connector.maxDailyExecutions !== null,
  ).length;
  const policyLimitReached = data.connectors.filter(
    (connector) =>
      connector.dailyPolicyUsagePercent !== null &&
      connector.dailyPolicyUsagePercent >= 100,
  ).length;
  const averageReliability =
    data.connectors.length > 0
      ? Math.round(
          (data.connectors.reduce(
            (sum, connector) =>
              sum + connector.reliabilityScore,
            0,
          ) /
            data.connectors.length) *
            100,
        ) / 100
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.9.2.11
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Connector SLA Monitoring
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Execution-policy consumption, SLA performance,
            reliability scoring, circuit-breaker resilience and
            governed remediation.
          </p>
        </div>

        <Link
          href="/app/automation/connectors"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Policy Administration
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Connectors
          </p>
          <p className="mt-2 text-3xl font-black">
            {data.connectors.length}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Healthy
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-700">
            {healthy}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Attention
          </p>
          <p className="mt-2 text-3xl font-black text-amber-700">
            {attention}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            SLA breaches
          </p>
          <p className="mt-2 text-3xl font-black text-red-700">
            {slaBreaches}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Policy constrained
          </p>
          <p className="mt-2 text-3xl font-black text-blue-700">
            {policyConstrained}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Daily limits reached
          </p>
          <p className="mt-2 text-3xl font-black text-red-700">
            {policyLimitReached}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Reliability
          </p>
          <p className="mt-2 text-3xl font-black">
            {averageReliability === null
              ? "—"
              : averageReliability}
          </p>
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
                <h2 className="mt-1 text-xl font-black">
                  {connector.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {connector.connectorKey}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>
                  Reliability: {connector.reliabilityScore}/100
                </p>
                <p className="mt-1">
                  All-time success:{" "}
                  {connector.successRate === null
                    ? "—"
                    : `${connector.successRate}%`}
                </p>
                <p className="mt-1">
                  Open circuit:{" "}
                  {connector.circuitState === "OPEN"
                    ? "Yes"
                    : "No"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Policy tag</p>
                <p className="mt-1 text-slate-500">
                  {connector.policyTag ?? "Default"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Daily execution policy</p>
                <p className="mt-1 text-slate-500">
                  {connector.executionsToday} /{" "}
                  {connector.maxDailyExecutions ?? "Unlimited"}
                </p>
                {connector.dailyPolicyUsagePercent !== null ? (
                  <p
                    className={`mt-1 ${
                      connector.dailyPolicyUsagePercent >= 100
                        ? "text-red-700"
                        : connector.dailyPolicyUsagePercent >= 80
                          ? "text-amber-700"
                          : "text-slate-400"
                    }`}
                  >
                    {connector.dailyPolicyUsagePercent}% consumed
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">SLA</p>
                <p
                  className={`mt-1 ${
                    connector.slaStatus === "BREACHED"
                      ? "text-red-700"
                      : "text-slate-500"
                  }`}
                >
                  {connector.slaStatus}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Availability</p>
                <p className="mt-1 text-slate-500">
                  {connector.slaAvailabilityPercent === null
                    ? "No data"
                    : `${connector.slaAvailabilityPercent}%`}
                </p>
                <p className="mt-1 text-slate-400">
                  Target {connector.slaTargetPercent}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">SLA window</p>
                <p className="mt-1 text-slate-500">
                  {connector.slaWindowHours}h ·{" "}
                  {connector.slaWindowExecutions} executions
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Circuit</p>
                <p className="mt-1 text-slate-500">
                  {connector.circuitState}
                </p>
                {connector.circuitState === "OPEN" &&
                connector.circuitRetryAt ? (
                  <p className="mt-1 text-red-700">
                    Retry after{" "}
                    {connector.circuitRetryAt.toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">Remediation</p>
                <p className="mt-1 text-slate-500">
                  {connector.autoRemediationEnabled
                    ? "Enabled"
                    : "Manual"}
                </p>
                <p className="mt-1 text-slate-400">
                  {connector.remediationCount} attempts
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">SLA breaches</p>
                <p className="mt-1 text-slate-500">
                  {connector.slaBreachCount}
                </p>
                <p className="mt-1 text-slate-400">
                  {connector.lastSlaBreachAt
                    ? connector.lastSlaBreachAt.toLocaleString()
                    : "None recorded"}
                </p>
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
                  <div
                    key={audit.id}
                    className="rounded-xl bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-black">{audit.type}</p>
                      <p className="text-slate-500">
                        {audit.createdAt.toLocaleString()}
                      </p>
                    </div>
                    {audit.message ? (
                      <p className="mt-1 text-slate-600">
                        {audit.message}
                      </p>
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
