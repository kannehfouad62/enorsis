import Link from "next/link";

import {
  queueConnectorSyncAction,
} from "@/modules/integration-hub/actions";
import {
  savePlaidTreasuryAccountMapAction,
} from "@/modules/integration-hub/plaid-mapping-actions";
import {
  getPlaidTreasuryMappingWorkspace,
} from "@/modules/integration-hub/plaid-mapping";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlaidTreasuryMappingPage({
  params,
}: {
  params: Promise<{
    connectionId: string;
  }>;
}) {
  const {
    connectionId,
  } = await params;

  const data =
    await getPlaidTreasuryMappingWorkspace(
      connectionId,
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Plaid Treasury
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Bank Account Mapping
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Map live Plaid bank accounts to active Enorsis Treasury
            accounts. Secret values and access tokens are never shown.
          </p>
        </div>

        <Link
          href="/app/settings/integration-hub"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
        >
          Back to Integration Hub
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Connection
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {data.connection.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.connection.status}
              {" · "}
              {data.connection.healthStatus}
            </p>
          </div>

          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            {data.plaidAccounts.length} Plaid accounts
          </span>
        </div>
      </section>

      <form
        action={savePlaidTreasuryAccountMapAction}
        className={`${card} mt-6`}
      >
        <input
          type="hidden"
          name="connectionId"
          value={data.connection.id}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">
                  Plaid account
                </th>
                <th className="pb-3">
                  Type
                </th>
                <th className="pb-3">
                  Balance
                </th>
                <th className="pb-3">
                  Currency
                </th>
                <th className="pb-3">
                  Enorsis Treasury account
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.plaidAccounts.map(
                (account) => {
                  const saved =
                    typeof data.savedMap[
                      account.accountId
                    ] === "string"
                      ? String(
                          data.savedMap[
                            account.accountId
                          ],
                        )
                      : "";

                  return (
                    <tr
                      key={account.accountId}
                    >
                      <td className="py-4 pr-4">
                        <p className="font-black text-slate-900">
                          {account.name}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                          {account.accountId}
                        </p>
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {account.type ?? "—"}
                        {account.subtype
                          ? ` · ${account.subtype}`
                          : ""}
                      </td>

                      <td className="py-4 pr-4 font-bold text-slate-900">
                        {account.available ??
                        account.current ??
                        null
                          ? new Intl.NumberFormat(
                              "en-US",
                              {
                                maximumFractionDigits: 2,
                              },
                            ).format(
                              account.available ??
                                account.current ??
                                0,
                            )
                          : "—"}
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {account.currencyCode ??
                          "—"}
                      </td>

                      <td className="py-4">
                        <select
                          name={`plaidAccount:${account.accountId}`}
                          defaultValue={saved}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <option value="">
                            Leave unmapped
                          </option>

                          {data.treasuryAccounts
                            .filter(
                              (treasury) =>
                                !account.currencyCode ||
                                treasury.currencyCode ===
                                  account.currencyCode,
                            )
                            .map(
                              (treasury) => (
                                <option
                                  key={
                                    treasury.id
                                  }
                                  value={
                                    treasury.id
                                  }
                                >
                                  {
                                    treasury.name
                                  }{" "}
                                  ·{" "}
                                  {
                                    treasury.currencyCode
                                  }{" "}
                                  ·{" "}
                                  {
                                    treasury.accountType
                                  }
                                </option>
                              ),
                            )}
                        </select>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Save account mapping
          </button>
        </div>
      </form>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black text-slate-950">
          First governed balance sync
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          After saving at least one mapping, queue an inbound sync.
          Enorsis will retrieve real-time Sandbox balances, retain
          provider evidence, and write Treasury balance snapshots for
          mapped accounts.
        </p>

        <form
          action={queueConnectorSyncAction}
          className="mt-5"
        >
          <input
            type="hidden"
            name="connectionId"
            value={data.connection.id}
          />
          <input
            type="hidden"
            name="mappingId"
            value=""
          />
          <input
            type="hidden"
            name="direction"
            value="INBOUND"
          />
          <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Queue governed inbound sync
          </button>
        </form>
      </section>
    </main>
  );
}
