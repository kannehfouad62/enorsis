import Link from "next/link";

import {
  createTreasuryAccountAction,
  createTreasuryCashFlowForecastAction,
  recordTreasuryBalanceAction,
  syncPaymentRunsToTreasuryForecastAction,
} from "@/modules/treasury-operations/actions";
import {
  getTreasuryWorkspace,
} from "@/modules/treasury-operations/queries";
import {
  LiquidityForecastChart,
} from "./charts";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export default async function TreasuryOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const data = await getTreasuryWorkspace();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Treasury operations
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Cash Position & Liquidity
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Maintain treasury account balances, expected inflows and
            outflows, and a governed 30-day liquidity view.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form
            action={syncPaymentRunsToTreasuryForecastAction}
          >
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Sync AP cash flows
            </button>
          </form>
          <Link
            href="/app/requisition-to-order/reconciliation/analytics"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
          >
            Reconciliation analytics
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Available cash", money(data.summary.totalAvailableCash)],
          ["30-day inflows", money(data.summary.expectedInflows)],
          ["30-day outflows", money(data.summary.expectedOutflows)],
          ["Projected 30-day cash", money(data.summary.projected30DayCash)],
          ["Lowest projected cash", money(data.summary.lowestProjectedCash)],
        ].map(([label, value]) => (
          <div key={label} className={card}>
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
          30-day liquidity forecast
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Projected available cash based on the latest recorded treasury
          balances and expected cash flows.
        </p>
        <LiquidityForecastChart data={data.forecastSeries} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Add treasury account
          </h2>

          <form
            action={createTreasuryAccountAction}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input
              name="name"
              required
              placeholder="Operating account"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="institutionName"
              placeholder="Bank / institution"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              name="accountType"
              defaultValue="OPERATING"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="OPERATING">Operating</option>
              <option value="PAYROLL">Payroll</option>
              <option value="TAX">Tax</option>
              <option value="RESERVE">Reserve</option>
              <option value="INVESTMENT">Investment</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              name="currencyCode"
              defaultValue="USD"
              maxLength={3}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="lastFour"
              maxLength={4}
              placeholder="Last 4 digits"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Create account
            </button>
          </form>
        </div>

        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Record account balance
          </h2>

          <form
            action={recordTreasuryBalanceAction}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <select
              name="treasuryAccountId"
              required
              defaultValue=""
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select treasury account
              </option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="balanceDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              name="availableBalance"
              required
              placeholder="Available balance"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              name="ledgerBalance"
              placeholder="Ledger balance (optional)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="sourceReference"
              placeholder="Statement / source reference"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Save balance
            </button>
          </form>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Expected cash flows
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              AP payment runs can be synchronized as governed treasury
              outflows while manual forecasts remain supported.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              {data.sourceMetrics.automatedForecastCount} AP-sourced
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {data.sourceMetrics.manualForecastCount} manual
            </span>
          </div>
        </div>

        <form
          action={createTreasuryCashFlowForecastAction}
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <select
            name="type"
            required
            defaultValue="OUTFLOW"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="INFLOW">Inflow</option>
            <option value="OUTFLOW">Outflow</option>
          </select>
          <input
            name="title"
            required
            placeholder="Payroll / customer receipt / tax"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="amount"
            required
            placeholder="Amount"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="currencyCode"
            defaultValue="USD"
            maxLength={3}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="expectedDate"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="treasuryAccountId"
            defaultValue=""
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Unallocated account</option>
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <input
            name="description"
            placeholder="Optional notes"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Add cash flow
          </button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Source</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.forecasts.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100"
                >
                  <td className="py-4">
                    {item.expectedDate.toLocaleDateString()}
                  </td>
                  <td className="py-4 font-bold">
                    {item.type}
                  </td>
                  <td className="py-4">{item.title}</td>
                  <td className="py-4">{item.status}</td>
                  <td className="py-4">
                    {item.sourceModule === "PAYMENT_BATCH"
                      ? "Accounts payable"
                      : "Manual"}
                  </td>
                  <td className="py-4 text-right font-black">
                    {money(Number(item.amount), item.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.forecasts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No expected cash flows are scheduled in the next 30 days.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Treasury accounts
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.accounts.map((account) => (
            <article
              key={account.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <p className="font-black text-slate-950">
                {account.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {account.institutionName ?? "Institution not specified"}
                {account.lastFour ? ` · •••• ${account.lastFour}` : ""}
              </p>
              <p className="mt-4 text-2xl font-black text-slate-950">
                {money(account.latestBalance, account.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {account.latestBalanceDate
                  ? `Balance as of ${account.latestBalanceDate.toLocaleDateString()}`
                  : "No balance snapshot recorded"}
              </p>
            </article>
          ))}

          {data.accounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No treasury accounts have been configured yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
