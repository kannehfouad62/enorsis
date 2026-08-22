import {
  importBankStatementCsvAction,
  recordBankReconciliationAction,
  updateReconciliationResolutionAction,
} from "@/modules/payment-reconciliation/actions";
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
          ["Open exceptions", data.metrics.openExceptionCount],
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Import bank statement
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload a CSV statement and automatically match transactions
              against Enorsis payment execution references.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            CSV · up to 5,000 rows
          </span>
        </div>

        <form
          action={importBankStatementCsvAction}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <label className="text-xs font-bold text-slate-600">
            Statement reference
            <input
              name="statementReference"
              required
              placeholder="AUG-2026-OPERATING-ACCOUNT"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-bold text-slate-600">
            CSV statement
            <input
              type="file"
              name="statementFile"
              accept=".csv,text/csv"
              required
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            className="self-end rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Import & reconcile
          </button>
        </form>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          Required columns: <strong>reference</strong> and{" "}
          <strong>amount</strong>. Optional supported columns include
          transaction_date/date, currency/currency_code, and
          description/memo. Matching is intentionally conservative:
          Enorsis requires an exact normalized execution reference.
        </div>

        {data.statementImports.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-3">File</th>
                  <th className="pb-3">Statement</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Rows</th>
                  <th className="pb-3 text-right">Matched</th>
                  <th className="pb-3 text-right">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {data.statementImports.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="py-3 font-bold">
                      {item.fileName}
                    </td>
                    <td className="py-3">
                      {item.statementReference}
                    </td>
                    <td className="py-3">
                      {item.status}
                    </td>
                    <td className="py-3 text-right">
                      {item.totalRows}
                    </td>
                    <td className="py-3 text-right">
                      {item.matchedRows}
                    </td>
                    <td className="py-3 text-right font-black text-rose-700">
                      {item.exceptionRows}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Reconciliation exception resolution
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Acknowledge, investigate, and resolve partial,
              unmatched, or duplicate settlement evidence
              without changing the original reconciliation
              classification.
            </p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            {data.metrics.openExceptionCount} open
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.reconciliations
            .filter(
              (item) =>
                item.status !== "MATCHED" &&
                item.resolutionStatus !== "RESOLVED",
            )
            .map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">
                      {item.statementReference}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.status}
                      {" · "}
                      {item.resolutionStatus}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Expected{" "}
                      {money(
                        item.expectedAmount,
                        item.currencyCode,
                      )}
                      {" · "}Settled{" "}
                      {money(
                        item.settledAmount,
                        item.currencyCode,
                      )}
                    </p>
                  </div>
                </div>

                {item.resolutionNotes ? (
                  <div className="mt-3 whitespace-pre-line rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                    {item.resolutionNotes}
                  </div>
                ) : null}

                <form
                  action={updateReconciliationResolutionAction}
                  className="mt-4 grid gap-3 border-t border-rose-100 pt-4 md:grid-cols-[190px_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="reconciliationId"
                    value={item.id}
                  />
                  <select
                    name="resolutionStatus"
                    required
                    defaultValue={
                      item.resolutionStatus === "OPEN"
                        ? "ACKNOWLEDGED"
                        : item.resolutionStatus
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ACKNOWLEDGED">
                      Acknowledge
                    </option>
                    <option value="INVESTIGATING">
                      Investigating
                    </option>
                    <option value="RESOLVED">
                      Resolve
                    </option>
                  </select>
                  <input
                    name="resolutionNote"
                    required
                    minLength={5}
                    placeholder="Investigation finding or corrective action"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  >
                    Update exception
                  </button>
                </form>
              </article>
            ))}

          {data.metrics.openExceptionCount === 0 ? (
            <p className="text-sm text-slate-500">
              No open reconciliation exceptions require action.
            </p>
          ) : null}
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
