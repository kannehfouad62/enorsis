import Link from "next/link";
import {
  Activity,
  CircleCheck,
  CircleX,
  Clock3,
  Network,
  ShieldAlert,
} from "lucide-react";
import { getIntegrationOperationsDashboard } from "@/modules/integrations/operations";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function IntegrationOperationsPage() {
  const data = await getIntegrationOperationsDashboard();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Integration operations
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Connector Health Center
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Last-24-hour delivery, webhook, retry and dead-letter visibility
            across tenant integrations.
          </p>
        </div>
        <Link
          href="/app/settings/integrations/jobs"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Open delivery jobs
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          icon={Network}
          label="Active"
          value={String(data.metrics.activeConnections)}
        />
        <Metric
          icon={CircleX}
          label="Connection errors"
          value={String(data.metrics.errorConnections)}
        />
        <Metric
          icon={Clock3}
          label="Queued"
          value={String(data.metrics.queuedJobs)}
        />
        <Metric
          icon={ShieldAlert}
          label="Dead letter"
          value={String(data.metrics.deadLetterJobs)}
        />
        <Metric
          icon={CircleCheck}
          label="Success rate"
          value={`${data.metrics.successRate}%`}
        />
        <Metric
          icon={Activity}
          label="Rejected webhooks"
          value={String(data.metrics.rejectedEvents)}
        />
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Connection health</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Connection</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last success</th>
              <th className="p-3">Last failure</th>
              <th className="p-3">Last error</th>
            </tr>
          </thead>
          <tbody>
            {data.connections.map((connection) => (
              <tr key={connection.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link
                    href={`/app/settings/integrations/${connection.id}`}
                    className="font-black text-blue-700"
                  >
                    {connection.name}
                  </Link>
                </td>
                <td className="p-3">
                  {connection.provider.replaceAll("_", " ")}
                </td>
                <td className="p-3 font-black">{connection.status}</td>
                <td className="p-3">
                  {connection.lastSuccessfulAt?.toLocaleString() ?? "—"}
                </td>
                <td className="p-3">
                  {connection.lastFailedAt?.toLocaleString() ?? "—"}
                </td>
                <td className="max-w-sm truncate p-3 text-red-700">
                  {connection.lastError ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Recent delivery failures</h2>
          <div className="mt-5 space-y-3">
            {data.jobs
              .filter((job) =>
                ["FAILED", "DEAD_LETTER"].includes(job.status),
              )
              .slice(0, 10)
              .map((job) => (
                <article key={job.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">
                    {job.integration.name} · {job.status}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.resourceType ?? "Unknown resource"} · Attempt{" "}
                    {job.attemptCount}
                  </p>
                  <p className="mt-2 text-sm text-red-700">
                    {job.errorMessage ?? "No error details"}
                  </p>
                </article>
              ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Rejected inbound events</h2>
          <div className="mt-5 space-y-3">
            {data.events
              .filter((event) => event.status === "REJECTED")
              .slice(0, 10)
              .map((event) => (
                <article key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">
                    {event.integration.name} · {event.eventType}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.receivedAt.toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-red-700">
                    {event.rejectedReason ?? "Rejected without reason"}
                  </p>
                </article>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
