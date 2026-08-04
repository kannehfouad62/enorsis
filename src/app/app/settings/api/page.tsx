import {
  createApiClientAction,
  revokeApiCredentialAction,
} from "@/modules/api-gateway/actions";
import { IssueCredentialForm } from "@/components/api-gateway/IssueCredentialForm";
import { getApiGatewayWorkspace } from "@/modules/api-gateway/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const scopes = [
  "suppliers:read",
  "purchase-orders:read",
  "invoices:read",
  "contracts:read",
  "sourcing:read",
];

export default async function ApiGatewayPage() {
  const { clients, logs } = await getApiGatewayWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise API management
      </p>
      <h1 className="mt-3 text-4xl font-black">API Gateway</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Issue tenant-scoped API credentials with least-privilege scopes,
        revocation, quotas and request-level audit history.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create API client</h2>
        <form action={createApiClientAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="name" placeholder="Client name" required />
          <input className={input} name="requestsPerMinute" type="number" min="1" defaultValue="60" />
          <input className={input} name="requestsPerDay" type="number" min="1" defaultValue="10000" />
          <input className={input} name="allowedIpCidrs" placeholder="Allowed CIDRs, comma separated" />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Purpose and owning system" />
          <div className="grid gap-2 md:col-span-2">
            {scopes.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" name="allowedScopes" value={scope} />
                {scope}
              </label>
            ))}
          </div>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create client
          </button>
        </form>
      </section>

      <div className="mt-6 space-y-5">
        {clients.map((client) => (
          <article key={client.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-blue-700">
                  {client.status}
                </p>
                <h2 className="mt-2 text-xl font-black">{client.name}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {client.allowedScopes.join(", ") || "No scopes"}
                </p>
              </div>
              <p className="text-sm font-black">
                {client.requestsPerMinute}/min · {client.requestsPerDay}/day
              </p>
            </div>

            <IssueCredentialForm apiClientId={client.id} />

            <div className="mt-5 space-y-3">
              {client.credentials.map((credential) => (
                <div key={credential.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="font-black">{credential.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {credential.prefix}…
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black">{credential.status}</span>
                    {credential.status === "ACTIVE" ? (
                      <form action={revokeApiCredentialAction}>
                        <input type="hidden" name="credentialId" value={credential.id} />
                        <button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white">
                          Revoke
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Recent API requests</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Method</th>
              <th className="p-3">Path</th>
              <th className="p-3">Scope</th>
              <th className="p-3">Outcome</th>
              <th className="p-3">Status</th>
              <th className="p-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="p-3">{log.createdAt.toLocaleString()}</td>
                <td className="p-3">{log.method}</td>
                <td className="p-3 font-mono text-xs">{log.path}</td>
                <td className="p-3">{log.scope ?? "—"}</td>
                <td className="p-3">{log.outcome}</td>
                <td className="p-3">{log.statusCode}</td>
                <td className="p-3">{log.durationMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
