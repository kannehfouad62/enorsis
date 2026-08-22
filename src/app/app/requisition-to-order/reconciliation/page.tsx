import { recordBankReconciliationAction } from "@/modules/payment-reconciliation/actions";
import { getPaymentReconciliationWorkspace } from "@/modules/payment-reconciliation/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function PaymentReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const data = await getPaymentReconciliationWorkspace();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
          Accounts payable
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Bank & Treasury Reconciliation
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Compare Enorsis payment runs against bank, treasury, ERP, or
          payment-provider settlement evidence and surface reconciliation
          exceptions.
        </p>
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
          ["Unreconciled", data.metrics.unreconciledCount],
          ["Matched", data.metrics.matchedCount],
          ["Exceptions", data.metrics.exceptionCount],
          ["Matched value", money(data.metrics.matchedAmount, "USD")],
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
          Settlement evidence awaiting reconciliation
        </h2>

        <div className="mt-5 space-y-5">
          {data.unreconciled.length ? (
            data.unreconciled.map((batch) => (
              <article
                key={batch.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <p className="font-black text-slate-950">
                  {batch.batchNumber}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {money(batch.totalAmount, batch.currencyCode)}
                  {" · "}
                  {batch.status}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Execution ref {batch.exportReference ?? "—"}
                </p>

                <form
                  action={recordBankReconciliationAction}
                  className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-3"
                >
                  <input
                    type="hidden"
                    name="paymentBatchId"
                    value={batch.id}
                  />

                  <label className="text-xs font-bold text-slate-600">
                    Statement reference
                    <input
                      name="statementReference"
                      required
                      placeholder="STATEMENT-2026-08-22"
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Bank / provider reference
                    <input
                      name="bankReference"
                      placeholder="BANK-REF-123456"
                      defaultValue={batch.exportReference ?? ""}
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Reconciliation date
                    <input
                      type="date"
                      name="reconciliationDate"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Settled amount
                    <input
                      type="number"
                      name="settledAmount"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={Number(batch.totalAmount)}
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Classification
                    <select
                      name="classification"
                      required
                      defaultValue="MATCHED"
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="MATCHED">Matched</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="UNMATCHED">Unmatched</option>
                      <option value="DUPLICATE">Duplicate</option>
                    </select>
                  </label>

                  <label className="text-xs font-bold text-slate-600">
                    Notes
                    <input
                      name="notes"
                      placeholder="Optional reconciliation notes"
                      className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="lg:col-span-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                    >
                      Record reconciliation
                    </button>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              All eligible payment runs have reconciliation records.
            </p>
          )}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Reconciliation register
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Statement</th>
                <th className="pb-3">Bank ref</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Expected</th>
                <th className="pb-3 text-right">Settled</th>
                <th className="pb-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.reconciliations.map((item) => {
                const expected = Number(item.expectedAmount);
                const settled = Number(item.settledAmount);

                return (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="py-4 font-black">
                      {item.statementReference}
                    </td>
                    <td className="py-4">
                      {item.bankReference ?? "—"}
                    </td>
                    <td className="py-4">{item.status}</td>
                    <td className="py-4">
                      {item.reconciliationDate.toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      {money(expected, item.currencyCode)}
                    </td>
                    <td className="py-4 text-right">
                      {money(settled, item.currencyCode)}
                    </td>
                    <td className="py-4 text-right font-black">
                      {money(settled - expected, item.currencyCode)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.reconciliations.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No reconciliation records are available yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
