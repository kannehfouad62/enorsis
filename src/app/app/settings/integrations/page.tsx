import Link from "next/link";
import { createIntegrationConnectionAction } from "@/modules/integrations/actions";
import { getIntegrationWorkspace } from "@/modules/integrations/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function IntegrationsPage() {
  const { integrations } = await getIntegrationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise connectivity
      </p>
      <h1 className="mt-3 text-4xl font-black">Integration Hub</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Configure tenant-isolated ERP, finance, HR and procurement connectors
        without storing raw credentials in the Enorsis database.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create connection</h2>
        <form
          action={createIntegrationConnectionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input className={input} name="key" placeholder="Unique key" required />
          <input className={input} name="name" placeholder="Connection name" required />
          <select className={input} name="provider" defaultValue="GENERIC_REST">
            {[
              "SAP",
              "ORACLE",
              "MICROSOFT_DYNAMICS",
              "NETSUITE",
              "WORKDAY",
              "COUPA",
              "ARIBA",
              "GENERIC_REST",
              "GENERIC_SFTP",
              "GENERIC_WEBHOOK",
              "OTHER",
            ].map((provider) => (
              <option key={provider} value={provider}>
                {provider.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select className={input} name="direction" defaultValue="BIDIRECTIONAL">
            <option value="INBOUND">Inbound</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="BIDIRECTIONAL">Bidirectional</option>
          </select>
          <input className={input} name="baseUrl" placeholder="Base URL" />
          <input
            className={input}
            name="secretReference"
            placeholder="Secret-manager reference"
          />
          <input
            className={input}
            name="webhookSecret"
            type="password"
            placeholder="Webhook secret"
          />
          <input
            className={input}
            name="retryLimit"
            type="number"
            min="0"
            max="20"
            defaultValue="3"
          />
          <input
            className={input}
            name="timeoutSeconds"
            type="number"
            min="1"
            max="300"
            defaultValue="30"
          />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input name="outboundEnabled" type="checkbox" />
            Enable outbound
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input name="inboundEnabled" type="checkbox" />
            Enable inbound
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create connection
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {integrations.map((integration) => (
          <article key={integration.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {integration.provider.replaceAll("_", " ")} · {integration.status}
            </p>
            <h2 className="mt-2 text-xl font-black">{integration.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {integration.direction} · {integration.mappings.length} mappings
            </p>
            <p className="mt-3 text-sm">
              {integration.jobs.length} recent jobs · {integration.events.length} recent events
            </p>
            <Link
              href={`/app/settings/integrations/${integration.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Open connection
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
