import Link from "next/link";

import {
  createTreasuryExternalAccountLinkAction,
} from "@/modules/treasury-connectivity/actions";
import {
  getTreasuryConnectivityWorkspace,
} from "@/modules/treasury-connectivity/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function TreasuryConnectivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const data =
    await getTreasuryConnectivityWorkspace();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Treasury connectivity
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Bank & ERP Connections
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Map governed Integration Hub connections to treasury
            accounts and process validated balance, FX, and cash-flow
            events without storing external credentials in treasury.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/settings/integration-hub"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Integration Hub
          </Link>
          <Link
            href="/app/requisition-to-order/treasury"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
          >
            Back to treasury
          </Link>
        </div>
      </header>

      {params.message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-900">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Active connections", data.metrics.activeConnections],
          ["Mapped accounts", data.metrics.mappedAccounts],
          ["Successful syncs", data.metrics.successfulSyncs],
          ["Failed syncs", data.metrics.failedSyncs],
        ].map(([label, value]) => (
          <div key={String(label)} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Map external bank / ERP account
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The external account ID must match the value sent in inbound
          treasury.balance or treasury.cash_flow events.
        </p>

        <form
          action={createTreasuryExternalAccountLinkAction}
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <select
            name="integrationId"
            required
            defaultValue=""
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Integration connection
            </option>
            {data.integrations.map((integration) => (
              <option
                key={integration.id}
                value={integration.id}
              >
                {integration.name} · {integration.provider}
              </option>
            ))}
          </select>

          <select
            name="treasuryAccountId"
            required
            defaultValue=""
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Treasury account
            </option>
            {data.treasuryAccounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name} · {account.currencyCode}
              </option>
            ))}
          </select>

          <input
            name="externalAccountId"
            required
            placeholder="External account ID"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <input
            name="externalAccountName"
            placeholder="External account name"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white xl:col-span-4"
          >
            Save account mapping
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Supported inbound treasury events
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[
            [
              "treasury.balance",
              "externalAccountId, availableBalance, optional ledgerBalance, balanceDate, sourceReference",
            ],
            [
              "treasury.fx_rate",
              "fromCurrencyCode, toCurrencyCode, rate, effectiveDate, sourceReference",
            ],
            [
              "treasury.cash_flow",
              "type, title, currencyCode, amount, expectedDate, optional externalAccountId and externalRecordId",
            ],
          ].map(([eventType, contract]) => (
            <div
              key={eventType}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <p className="font-black text-slate-950">
                {eventType}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {contract}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Inbound webhook:
          {" "}
          /api/integrations/[key]/webhook
          {" · "}
          Treasury processor:
          {" "}
          /api/platform/treasury/connectivity/process
        </p>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          External account mappings
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Connection</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">External account</th>
                <th className="pb-3">Treasury account</th>
              </tr>
            </thead>
            <tbody>
              {data.accountLinks.map((link) => (
                <tr
                  key={link.id}
                  className="border-t border-slate-100"
                >
                  <td className="py-4 font-black">
                    {link.integration?.name ?? link.integrationId}
                  </td>
                  <td className="py-4">
                    {link.integration?.provider ?? "—"}
                  </td>
                  <td className="py-4">
                    {link.externalAccountName
                      ? `${link.externalAccountName} · `
                      : ""}
                    {link.externalAccountId}
                  </td>
                  <td className="py-4">
                    {link.treasuryAccount?.name ??
                      link.treasuryAccountId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.accountLinks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No external treasury accounts have been mapped yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Connectivity sync history
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Processed</th>
                <th className="pb-3">Event</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {data.syncLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-slate-100"
                >
                  <td className="py-4">
                    {log.processedAt.toLocaleString()}
                  </td>
                  <td className="py-4 font-bold">
                    {log.eventType}
                  </td>
                  <td className="py-4">
                    {log.status}
                  </td>
                  <td className="py-4 text-slate-600">
                    {log.message ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.syncLogs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No treasury connectivity events have been processed yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
