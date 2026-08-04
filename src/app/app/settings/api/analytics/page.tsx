import Link from "next/link";
import {
  Activity,
  Ban,
  CircleCheck,
  CircleX,
  Clock3,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import {
  reactivateApiClientAction,
  revokeApiClientAction,
  suspendApiClientAction,
} from "@/modules/api-gateway/actions";
import { getApiGatewayAnalytics } from "@/modules/api-gateway/analytics";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ApiGatewayAnalyticsPage() {
  const data = await getApiGatewayAnalytics();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            API operations
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Gateway Analytics
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Last-24-hour traffic, access denials, quotas, client health and
            endpoint usage.
          </p>
        </div>
        <Link
          href="/app/settings/api"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Manage API clients
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-7">
        <Metric icon={Activity} label="Requests" value={data.metrics.totalRequests} />
        <Metric icon={CircleCheck} label="Allowed" value={data.metrics.allowed} />
        <Metric icon={Ban} label="Denied" value={data.metrics.denied} />
        <Metric icon={ShieldCheck} label="Rate limited" value={data.metrics.rateLimited} />
        <Metric icon={CircleX} label="Errors" value={data.metrics.errors} />
        <Metric icon={Clock3} label="Avg latency" value={`${data.metrics.averageDuration} ms`} />
        <Metric icon={KeyRound} label="Active keys" value={data.metrics.activeCredentials} />
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">API clients</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Status</th>
              <th className="p-3">Scopes</th>
              <th className="p-3">IP rules</th>
              <th className="p-3">Credentials</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((client) => (
              <tr key={client.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{client.name}</td>
                <td className="p-3">{client.status}</td>
                <td className="p-3">{client.allowedScopes.length}</td>
                <td className="p-3">
                  {client.allowedIpCidrs.length === 0
                    ? "Any"
                    : client.allowedIpCidrs.join(", ")}
                </td>
                <td className="p-3">{client.credentials.length}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {client.status === "ACTIVE" ? (
                      <form action={suspendApiClientAction}>
                        <input type="hidden" name="apiClientId" value={client.id} />
                        <button className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white">
                          Suspend
                        </button>
                      </form>
                    ) : null}
                    {client.status === "SUSPENDED" ? (
                      <form action={reactivateApiClientAction}>
                        <input type="hidden" name="apiClientId" value={client.id} />
                        <button className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">
                          Reactivate
                        </button>
                      </form>
                    ) : null}
                    {client.status !== "REVOKED" ? (
                      <form action={revokeApiClientAction}>
                        <input type="hidden" name="apiClientId" value={client.id} />
                        <button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white">
                          Revoke
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Ranking title="Top endpoints" items={data.topPaths} />
        <Ranking title="Top scopes" items={data.topScopes} />
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
  value: string | number;
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

function Ranking({
  title,
  items,
}: {
  title: string;
  items: Array<[string, number]>;
}) {
  return (
    <section className={card}>
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map(([name, count]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
          >
            <code className="text-xs">{name}</code>
            <span className="font-black">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
