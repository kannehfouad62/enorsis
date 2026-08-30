import Link from "next/link";
import {
  cancelExternalPaymentAction,
  confirmExternalPaymentReceiptAction,
  disputeExternalPaymentAction,
  recordExternalPaymentAction,
  resolveExternalPaymentDisputeAction,
} from "@/modules/payment-operations/external-settlement-actions";
import { getExternalSettlementWorkspace } from "@/modules/payment-operations/external-settlement-queries";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export default async function ExternalSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getExternalSettlementWorkspace();

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Accounts payable · dual settlement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          External Payment Settlement
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Record payments completed through an ERP, bank,
          treasury platform, check, mobile-money or another
          established finance system. Buyer declarations remain
          pending until the supplier confirms receipt.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/requisition-to-order/payments"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800"
          >
            Payment Operations
          </Link>
          <Link
            href="/app/requisition-to-order/payment-readiness"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800"
          >
            Payment Readiness
          </Link>
          <Link
            href="/app/supplier-portal"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800"
          >
            Supplier Portal
          </Link>
        </div>
      </div>

      {params.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Buyer declared", money(data.intelligence.buyerDeclared)],
          ["Buyer confirmed", money(data.intelligence.buyerConfirmed)],
          ["Buyer pending", money(data.intelligence.buyerPending)],
          ["Supplier confirmed revenue", money(data.intelligence.supplierConfirmed)],
          ["Reconciliation gap", money(data.intelligence.reconciliationGapUsd)],
          ["Disputes", String(data.intelligence.disputes)],
          ["Confirmation overdue", String(data.intelligence.overdueConfirmations)],
          ["Cancelled records", String(data.intelligence.cancelled)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">
          Record payment made outside Enorsis
        </h2>

        <form
          action={recordExternalPaymentAction}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <label className="space-y-1">
            <span className="text-sm font-bold">Approved payable</span>
            <select
              name="readinessCaseId"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">Select payable</option>
              {data.approvedReadiness.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.readinessNumber} ·{" "}
                  {item.invoiceNumber ?? item.supplierInvoiceId} ·{" "}
                  {item.currencyCode} {item.invoiceAmount.toString()}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Payment amount</span>
            <input
              name="paymentAmount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Payment date</span>
            <input
              name="paymentDate"
              type="date"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Payment method</span>
            <select
              name="externalPaymentMethod"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">Select method</option>
              {[
                "ACH",
                "WIRE_TRANSFER",
                "BANK_TRANSFER",
                "CHECK",
                "CARD",
                "ERP_PAYMENT",
                "TREASURY_PLATFORM",
                "MOBILE_MONEY",
                "CASH",
                "OTHER",
              ].map((method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Payment reference</span>
            <input
              name="paymentReference"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">External system</span>
            <input
              name="externalSystemName"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="NetSuite, SAP, bank portal, etc."
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Evidence reference</span>
            <input
              name="evidenceReference"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Record external payment
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Supplier confirmations</h2>

        <div className="mt-6 space-y-4">
          {data.awaitingSupplierConfirmation.length === 0 ? (
            <p className="text-sm text-slate-500">
              No external payments are awaiting confirmation for
              this supplier tenant.
            </p>
          ) : (
            data.awaitingSupplierConfirmation.map((settlement) => {
              const invoice =
                data.invoiceById.get(settlement.supplierInvoiceId);

              return (
                <div
                  key={settlement.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <p className="font-black">
                    {invoice?.invoiceNumber ??
                      settlement.supplierInvoiceId}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {money(
                      Number(settlement.paymentAmount),
                      settlement.currencyCode,
                    )}{" "}
                    · {settlement.paymentReference ?? "No reference"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={confirmExternalPaymentReceiptAction}>
                      <input
                        type="hidden"
                        name="settlementId"
                        value={settlement.id}
                      />
                      <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                        Confirm payment received
                      </button>
                    </form>

                    <form
                      action={disputeExternalPaymentAction}
                      className="flex flex-1 gap-2"
                    >
                      <input
                        type="hidden"
                        name="settlementId"
                        value={settlement.id}
                      />
                      <input
                        name="reason"
                        required
                        minLength={5}
                        placeholder="Payment not received, partial amount, wrong currency..."
                        className="min-w-64 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-black text-rose-700">
                        Report issue
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">
          Buyer external-payment ledger
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {data.buyerSettlements.map((settlement) => {
                const invoice =
                  data.invoiceById.get(settlement.supplierInvoiceId);

                return (
                  <tr
                    key={settlement.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-3 font-bold">
                      {invoice?.invoiceNumber ??
                        settlement.supplierInvoiceId}
                    </td>
                    <td className="px-3 py-3">
                      {settlement.paymentReference ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {money(
                        Number(settlement.paymentAmount),
                        settlement.currencyCode,
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {settlement.status.replaceAll("_", " ")}
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        {settlement.externalPaymentMethod?.replaceAll(
                          "_",
                          " ",
                        ) ?? "—"}
                      </div>

                      {[
                        "BUYER_RECORDED",
                        "AWAITING_SUPPLIER_CONFIRMATION",
                        "CONFIRMATION_OVERDUE",
                      ].includes(settlement.status) ? (
                        <form
                          action={cancelExternalPaymentAction}
                          className="mt-2 flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="settlementId"
                            value={settlement.id}
                          />
                          <input
                            name="cancellationReason"
                            required
                            minLength={5}
                            placeholder="Cancellation reason"
                            className="min-w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-black text-rose-700">
                            Cancel
                          </button>
                        </form>
                      ) : null}

                      {settlement.status === "DISPUTED" ? (
                        <form
                          action={resolveExternalPaymentDisputeAction}
                          className="mt-2 space-y-2"
                        >
                          <input
                            type="hidden"
                            name="settlementId"
                            value={settlement.id}
                          />
                          <select
                            name="resolutionAction"
                            required
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">
                              Resolve dispute…
                            </option>
                            <option value="REOPEN_CONFIRMATION">
                              Reopen supplier confirmation
                            </option>
                            <option value="CANCEL">
                              Cancel payment record
                            </option>
                          </select>
                          <input
                            name="resolutionNotes"
                            required
                            minLength={5}
                            placeholder="Resolution notes"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-black text-white">
                            Resolve
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">
          External settlement certification
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Settlement records",
              data.intelligence.externalSettlementCount,
              "Every buyer declaration remains independently auditable.",
            ],
            [
              "Confirmed",
              data.intelligence.confirmedSettlementCount,
              "Only supplier-confirmed funds contribute to confirmed settlement.",
            ],
            [
              "Unreconciled USD",
              money(data.intelligence.reconciliationGapUsd),
              "Declared, overdue or disputed funds not yet supplier-confirmed.",
            ],
            [
              "Control exceptions",
              data.intelligence.disputes +
                data.intelligence.overdueConfirmations,
              "Disputes and overdue confirmations requiring operational attention.",
            ],
          ].map(([label, value, description]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black">
                {String(value)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
