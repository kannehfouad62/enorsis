import Link from "next/link";

import {
  confirmDuplicateBankStatementRowAction,
  importBankStatementCsvAction,
  manuallyMatchBankStatementRowAction,
  recordBankReconciliationAction,
  updateReconciliationResolutionAction,
} from "@/modules/payment-reconciliation/actions";
import {
  assignReconciliationGovernanceAction,
  closeReconciliationPeriodAction,
  decideReconciliationResolutionApprovalAction,
  requestReconciliationResolutionApprovalAction,
} from "@/modules/reconciliation-governance/actions";
import { getPaymentReconciliationWorkspace } from "@/modules/payment-reconciliation/queries";
import { getExternalSettlementReconciliationSummary } from "@/modules/payment-operations/external-settlement-queries";
import { auth } from "@/auth";

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
  const session = await auth();
  const data = await getPaymentReconciliationWorkspace();
  const externalSettlement =
    session?.user?.tenantId
      ? await getExternalSettlementReconciliationSummary(
          session.user.tenantId,
        )
      : null;
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

      {externalSettlement ? (
        <section className={card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                External settlement reconciliation
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Buyer-declared payments outside Enorsis
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                These payments were executed through an ERP, bank,
                treasury platform or other external finance system.
                Supplier-confirmed amounts are financially settled;
                pending, overdue and disputed amounts remain open
                reconciliation exposure.
              </p>
            </div>

            <Link
              href="/app/requisition-to-order/settlements/external"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800"
            >
              Open external settlements
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Records", externalSettlement.totalCount],
              ["Confirmed", externalSettlement.confirmedCount],
              ["Pending", externalSettlement.pendingCount],
              ["Disputed", externalSettlement.disputedCount],
              [
                "Confirmed USD",
                money(externalSettlement.confirmedUsd, "USD"),
              ],
              [
                "Open exposure USD",
                money(
                  externalSettlement.pendingUsd +
                    externalSettlement.disputedUsd,
                  "USD",
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-xl font-black text-slate-950">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>

          {externalSettlement.latest.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Payment date</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {externalSettlement.latest.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-3 font-bold">
                        {item.paymentReference ?? item.id}
                      </td>
                      <td className="py-3">
                        {item.status.replaceAll("_", " ")}
                      </td>
                      <td className="py-3">
                        {item.externalPaymentMethod?.replaceAll(
                          "_",
                          " ",
                        ) ?? "—"}
                      </td>
                      <td className="py-3">
                        {item.paymentDate
                          ? item.paymentDate.toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 text-right font-black">
                        {money(
                          item.paymentAmount,
                          item.currencyCode,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No external settlement records exist for this tenant.
            </p>
          )}
        </section>
      ) : null}

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
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
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
            Mapping profile
            <select
              name="mappingProfileId"
              defaultValue=""
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                Automatic common-header detection
              </option>
              {data.mappingProfiles.map((profile) => (
                <option
                  key={profile.id}
                  value={profile.id}
                >
                  {profile.name}
                  {profile.providerName
                    ? ` · ${profile.providerName}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600">
            Automation rule
            <select
              name="automationRuleId"
              defaultValue=""
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                Strict default rule
              </option>
              {data.automationRules.map((rule) => (
                <option
                  key={rule.id}
                  value={rule.id}
                >
                  {rule.name}
                </option>
              ))}
            </select>
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
          When no profile is selected, required columns are{" "}
          <strong>reference</strong> and <strong>amount</strong>.
          Common date, currency, and description aliases are detected
          automatically. A selected mapping profile overrides these
          header aliases while preserving the same conservative payment
          reference matching logic.
          <div className="mt-3">
            <Link
              href="/app/requisition-to-order/reconciliation/mappings"
              className="font-black text-blue-700"
            >
              Manage bank statement mapping profiles →
            </Link>
            <span className="mx-2 text-slate-300">|</span>
            <Link
              href="/app/requisition-to-order/reconciliation/rules"
              className="font-black text-blue-700"
            >
              Manage automation rules →
            </Link>
            <span className="mx-2 text-slate-300">|</span>
            <Link
              href="/app/requisition-to-order/reconciliation/analytics"
              className="font-black text-blue-700"
            >
              Treasury intelligence →
            </Link>
          </div>
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
              Bank statement exception review
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review imported rows that were not automatically
              reconciled. Manually link a valid row to an eligible
              payment run or confirm a true duplicate.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            {data.statementExceptionRows.length} rows to review
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.statementExceptionRows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">
                      Row {row.rowNumber}
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
                      {row.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">
                    Reference:{" "}
                    <span className="font-bold">
                      {row.reference ?? "—"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Amount:{" "}
                    {row.amount !== null
                      ? money(
                          row.amount,
                          row.currencyCode ?? "USD",
                        )
                      : "Invalid / unavailable"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.transactionDate
                      ? row.transactionDate.toLocaleDateString()
                      : "No valid transaction date"}
                    {row.description
                      ? ` · ${row.description}`
                      : ""}
                  </p>

                  {row.exceptionReason ? (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-white p-3 text-xs leading-5 text-rose-700">
                      {row.exceptionReason}
                    </p>
                  ) : null}
                </div>
              </div>

              {row.status === "DUPLICATE" ? (
                <form
                  action={confirmDuplicateBankStatementRowAction}
                  className="mt-4 flex flex-wrap gap-3 border-t border-amber-100 pt-4"
                >
                  <input
                    type="hidden"
                    name="statementRowId"
                    value={row.id}
                  />
                  <input
                    name="reviewNote"
                    required
                    minLength={5}
                    placeholder="Why is this a confirmed duplicate?"
                    className="min-w-[260px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-800"
                  >
                    Confirm duplicate
                  </button>
                </form>
              ) : row.amount !== null ? (
                <form
                  action={manuallyMatchBankStatementRowAction}
                  className="mt-4 grid gap-3 border-t border-amber-100 pt-4 lg:grid-cols-[minmax(240px,1fr)_minmax(260px,1fr)_auto]"
                >
                  <input
                    type="hidden"
                    name="statementRowId"
                    value={row.id}
                  />

                  <select
                    name="paymentBatchId"
                    required
                    defaultValue=""
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Select eligible payment run
                    </option>
                    {data.candidatePaymentBatches.map(
                      (batch) => (
                        <option
                          key={batch.id}
                          value={batch.id}
                        >
                          {batch.batchNumber} ·{" "}
                          {money(
                            batch.totalAmount,
                            batch.currencyCode,
                          )}
                          {" · "}
                          {batch.exportReference ?? "No ref"}
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    name="reviewNote"
                    required
                    minLength={5}
                    placeholder="Explain why this row belongs to the selected payment run"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  >
                    Match row
                  </button>
                </form>
              ) : (
                <p className="mt-4 border-t border-amber-100 pt-4 text-xs font-bold text-slate-500">
                  Correct the source data and re-import this row because
                  it does not contain a valid amount.
                </p>
              )}
            </article>
          ))}

          {data.statementExceptionRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No imported bank statement rows require manual review.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Reconciliation governance & approvals
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              DUPLICATE exceptions and variances of 1,000 or more
              require maker-checker approval before resolution.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
            {data.governanceCases.filter(
              (item) => item.status !== "CLOSED",
            ).length} governed
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.reconciliations
            .filter((item) => {
              if (
                item.status === "MATCHED" ||
                item.resolutionStatus === "RESOLVED"
              ) {
                return false;
              }

              const variance = Math.abs(
                Number(item.expectedAmount) -
                  Number(item.settledAmount),
              );

              return (
                item.status === "DUPLICATE" ||
                variance >= 1000
              );
            })
            .map((item) => {
              const governance =
                data.governanceCases.find(
                  (entry) =>
                    entry.reconciliationId === item.id,
                );

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-violet-200 bg-violet-50/30 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {item.statementReference}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.status} ·{" "}
                        {governance?.status ?? "OPEN"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Variance{" "}
                        {money(
                          Math.abs(
                            Number(item.expectedAmount) -
                              Number(item.settledAmount),
                          ),
                          item.currencyCode,
                        )}
                      </p>
                    </div>
                  </div>

                  <form
                    action={assignReconciliationGovernanceAction}
                    className="mt-4 grid gap-3 border-t border-violet-100 pt-4 md:grid-cols-[1fr_180px_auto]"
                  >
                    <input
                      type="hidden"
                      name="reconciliationId"
                      value={item.id}
                    />
                    <select
                      name="ownerUserId"
                      defaultValue={
                        governance?.ownerUserId ?? ""
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">
                        Assign to me
                      </option>
                      {data.financeMembers.map((member) => (
                        <option
                          key={member.userId}
                          value={member.userId}
                        >
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      name="dueAt"
                      defaultValue={
                        governance?.dueAt
                          ? governance.dueAt
                              .toISOString()
                              .slice(0, 10)
                          : ""
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-black text-violet-700"
                    >
                      Save ownership
                    </button>
                  </form>

                  {governance?.status ===
                  "PENDING_APPROVAL" ? (
                    <form
                      action={decideReconciliationResolutionApprovalAction}
                      className="mt-3 grid gap-3 rounded-xl border border-violet-200 bg-white p-3 md:grid-cols-[140px_1fr_auto]"
                    >
                      <input
                        type="hidden"
                        name="governanceCaseId"
                        value={governance.id}
                      />
                      <select
                        name="decision"
                        required
                        defaultValue="APPROVE"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="APPROVE">
                          Approve
                        </option>
                        <option value="REJECT">
                          Reject
                        </option>
                      </select>
                      <input
                        name="decisionNote"
                        required
                        minLength={5}
                        placeholder="Independent approval decision note"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-black text-white"
                      >
                        Record decision
                      </button>
                    </form>
                  ) : (
                    <form
                      action={requestReconciliationResolutionApprovalAction}
                      className="mt-3 flex flex-wrap gap-3"
                    >
                      <input
                        type="hidden"
                        name="reconciliationId"
                        value={item.id}
                      />
                      <input
                        name="resolutionRequest"
                        required
                        minLength={10}
                        placeholder="Describe the proposed material-exception resolution"
                        className="min-w-[300px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white"
                      >
                        Request approval
                      </button>
                    </form>
                  )}
                </article>
              );
            })}

          {data.reconciliations.filter((item) => {
            const variance = Math.abs(
              Number(item.expectedAmount) -
                Number(item.settledAmount),
            );
            return (
              item.status !== "MATCHED" &&
              item.resolutionStatus !== "RESOLVED" &&
              (item.status === "DUPLICATE" ||
                variance >= 1000)
            );
          }).length === 0 ? (
            <p className="text-sm text-slate-500">
              No material reconciliation exceptions currently require
              maker-checker governance.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Reconciliation period close
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Closing is blocked while any unresolved DUPLICATE or material
          variance of 1,000 or more exists inside the selected period.
        </p>

        <form
          action={closeReconciliationPeriodAction}
          className="mt-5 grid gap-3 md:grid-cols-[180px_180px_1fr_auto]"
        >
          <input
            type="date"
            name="periodStart"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="periodEnd"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="closeNote"
            required
            minLength={5}
            placeholder="Period close certification note"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Close period
          </button>
        </form>

        {data.closePeriods.length ? (
          <div className="mt-5 space-y-2">
            {data.closePeriods.map((period) => (
              <div
                key={period.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-bold text-slate-700">
                  {period.periodStart.toLocaleDateString()} –{" "}
                  {period.periodEnd.toLocaleDateString()}
                </span>
                <span className="font-black text-emerald-700">
                  {period.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
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
