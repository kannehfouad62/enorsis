import Link from "next/link";
import {
  createAutomationConnectorAction,
  setAutomationConnectorStatusAction,
  testAutomationConnectorAction,
} from "@/modules/enterprise-automation/connector-actions";
import { getAutomationConnectorRegistry } from "@/modules/enterprise-automation/connector-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutomationConnectorsPage() {
  const data = await getAutomationConnectorRegistry();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.9.2.9
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed Connector Registry
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Tenant-managed connector definitions with credential references,
            allowlists, testing, activation controls and usage visibility.
          </p>
        </div>

        <Link
          href="/app/automation/runtime"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Durable Runtime
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Register connector
        </h2>

        <form
          action={createAutomationConnectorAction}
          className="mt-5 grid gap-4 lg:grid-cols-2"
        >
          <input
            name="name"
            required
            placeholder="Connector name"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <input
            name="connectorKey"
            required
            placeholder="ERP_PRIMARY"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
          />

          <select
            name="type"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="HTTP">HTTP</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="DOMAIN_EVENT">Domain Event</option>
          </select>

          <input
            name="baseUrl"
            placeholder="https://api.example.com/endpoint"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <input
            name="allowedHosts"
            placeholder="api.example.com, hooks.example.com"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <input
            name="secretEnvKey"
            placeholder="ENORSIS_ERP_API_TOKEN"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
          />

          <input
            name="timeoutMs"
            type="number"
            min="1000"
            max="120000"
            defaultValue="15000"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Register connector
          </button>
        </form>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        {data.connectors.map((connector) => (
          <article
            key={connector.id}
            className={card}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {connector.type} · {connector.status}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {connector.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {connector.connectorKey}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>Uses: {connector.usageCount}</p>
                <p className="mt-1">
                  Last used:{" "}
                  {connector.lastUsedAt?.toLocaleString() ?? "Never"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <p>
                <span className="font-black">URL:</span>{" "}
                {connector.baseUrl ?? "—"}
              </p>
              <p>
                <span className="font-black">
                  Secret reference:
                </span>{" "}
                {connector.secretEnvKey ?? "None"}
              </p>
              <p>
                <span className="font-black">Timeout:</span>{" "}
                {connector.timeoutMs} ms
              </p>
              <p>
                <span className="font-black">Last test:</span>{" "}
                {connector.lastTestStatus ?? "Never tested"}
              </p>
              {connector.lastTestMessage ? (
                <p className="text-xs text-slate-500">
                  {connector.lastTestMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <form action={testAutomationConnectorAction}>
                <input
                  type="hidden"
                  name="connectorId"
                  value={connector.id}
                />
                <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                  Test configuration
                </button>
              </form>

              <form action={setAutomationConnectorStatusAction}>
                <input
                  type="hidden"
                  name="connectorId"
                  value={connector.id}
                />
                <input
                  type="hidden"
                  name="status"
                  value={
                    connector.status === "ACTIVE"
                      ? "DISABLED"
                      : "ACTIVE"
                  }
                />
                <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                  {connector.status === "ACTIVE"
                    ? "Disable"
                    : "Activate"}
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
