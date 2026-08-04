import Link from "next/link";
import {
  activateIntegrationConnectionAction,
  createIntegrationMappingAction,
  queueIntegrationJobAction,
} from "@/modules/integrations/actions";
import { getIntegrationDetail } from "@/modules/integrations/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { integration } = await getIntegrationDetail(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href="/app/settings/integrations"
        className="font-black text-blue-700"
      >
        ← Integrations
      </Link>
      <h1 className="mt-5 text-4xl font-black">{integration.name}</h1>
      <p className="mt-2 text-slate-600">
        {integration.provider.replaceAll("_", " ")} · {integration.status}
      </p>

      <section className={`${card} mt-8`}>
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Direction" value={integration.direction} />
          <Summary
            label="Outbound"
            value={integration.outboundEnabled ? "Enabled" : "Disabled"}
          />
          <Summary
            label="Inbound"
            value={integration.inboundEnabled ? "Enabled" : "Disabled"}
          />
          <Summary
            label="Retry limit"
            value={String(integration.retryLimit)}
          />
        </div>

        {integration.status !== "ACTIVE" ? (
          <form action={activateIntegrationConnectionAction} className="mt-5">
            <input type="hidden" name="integrationId" value={integration.id} />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
              Activate connection
            </button>
          </form>
        ) : null}

        {integration.inboundEnabled ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
            Webhook endpoint:{" "}
            <code>/api/integrations/{integration.key}/webhook</code>
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Mapping profile</h2>
          <form action={createIntegrationMappingAction} className="mt-5 grid gap-3">
            <input type="hidden" name="integrationId" value={integration.id} />
            <input className={input} name="key" placeholder="Mapping key" required />
            <input className={input} name="name" placeholder="Mapping name" required />
            <input className={input} name="sourceEntity" placeholder="Source entity" required />
            <input className={input} name="targetEntity" placeholder="Target entity" required />
            <textarea
              className={`${input} min-h-32 font-mono text-xs`}
              name="fieldMappings"
              placeholder='{"sourceField":"targetField"}'
              required
            />
            <textarea
              className={`${input} min-h-24 font-mono text-xs`}
              name="transforms"
              placeholder='{"currency":"uppercase"}'
            />
            <textarea
              className={`${input} min-h-24 font-mono text-xs`}
              name="validationRules"
              placeholder='{"required":["supplierNumber"]}'
            />
            <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
              Save mapping
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Queue outbound job</h2>
          <form action={queueIntegrationJobAction} className="mt-5 grid gap-3">
            <input type="hidden" name="integrationId" value={integration.id} />
            <select className={input} name="resourceType" defaultValue="PurchaseOrder">
              <option value="PurchaseOrder">Purchase order</option>
              <option value="PaymentBatch">Payment batch</option>
              <option value="Supplier">Supplier</option>
            </select>
            <input className={input} name="resourceId" placeholder="Enorsis resource ID" required />
            <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
              Queue export job
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recent jobs</h2>
        <div className="mt-4 space-y-3">
          {integration.jobs.map((job) => (
            <article key={job.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-black">
                {job.resourceType ?? "Unspecified"} · {job.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Attempts: {job.attemptCount} · {job.createdAt.toLocaleString()}
              </p>
              {job.errorMessage ? (
                <p className="mt-2 text-sm text-red-700">{job.errorMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recent inbound events</h2>
        <div className="mt-4 space-y-3">
          {integration.events.map((event) => (
            <article key={event.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-black">
                {event.eventType} · {event.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {event.receivedAt.toLocaleString()} · Signature{" "}
                {event.signatureValid === null
                  ? "not checked"
                  : event.signatureValid
                    ? "valid"
                    : "invalid"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}
