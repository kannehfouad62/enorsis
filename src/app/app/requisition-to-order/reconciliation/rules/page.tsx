import Link from "next/link";

import {
  createBankReconciliationAutomationRuleAction,
  setBankReconciliationAutomationRuleActiveAction,
} from "@/modules/reconciliation-automation-rules/actions";
import {
  getBankReconciliationAutomationRules,
} from "@/modules/reconciliation-automation-rules/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ReconciliationAutomationRulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const rules =
    await getBankReconciliationAutomationRules();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Accounts payable
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Reconciliation Automation Rules
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Govern automatic bank-statement matching while retaining
            exact execution-reference matching as the mandatory primary
            control.
          </p>
        </div>

        <Link
          href="/app/requisition-to-order/reconciliation"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
        >
          Back to reconciliation
        </Link>
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

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Create automation rule
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Exact payment execution reference remains required. These
          controls determine whether a reference match may be accepted
          automatically.
        </p>

        <form
          action={createBankReconciliationAutomationRuleAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-xs font-bold text-slate-600">
            Rule name
            <input
              name="name"
              required
              placeholder="Strict ACH settlement"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-bold text-slate-600">
            Amount tolerance
            <input
              type="number"
              name="amountTolerance"
              required
              min="0"
              max="1000"
              step="0.0001"
              defaultValue="0.005"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-bold text-slate-600">
            Settlement date window (days)
            <input
              type="number"
              name="maxDateVarianceDays"
              required
              min="0"
              max="365"
              step="1"
              defaultValue="7"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-bold text-slate-600">
            Description
            <input
              name="description"
              placeholder="Optional governance note"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="requireCurrencyMatch"
              defaultChecked
            />
            Require bank currency to match payment currency
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="allowPartialMatch"
              defaultChecked
            />
            Allow partial settlement classification
          </label>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Save automation rule
            </button>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Saved automation rules
        </h2>

        <div className="mt-5 space-y-4">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">
                      {rule.name}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                        rule.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {rule.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  {rule.description ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {rule.description}
                    </p>
                  ) : null}
                </div>

                <form
                  action={setBankReconciliationAutomationRuleActiveAction}
                >
                  <input
                    type="hidden"
                    name="ruleId"
                    value={rule.id}
                  />
                  <input
                    type="hidden"
                    name="active"
                    value={rule.active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
                  >
                    {rule.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-black uppercase tracking-wide text-slate-400">
                    Amount tolerance
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {String(rule.amountTolerance)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-black uppercase tracking-wide text-slate-400">
                    Date window
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    ±{rule.maxDateVarianceDays} days
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-black uppercase tracking-wide text-slate-400">
                    Currency
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {rule.requireCurrencyMatch
                      ? "Must match"
                      : "Not required"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-black uppercase tracking-wide text-slate-400">
                    Partial settlement
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {rule.allowPartialMatch
                      ? "Allowed"
                      : "Exception only"}
                  </p>
                </div>
              </div>
            </article>
          ))}

          {rules.length === 0 ? (
            <p className="text-sm text-slate-500">
              No automation rules have been created yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
