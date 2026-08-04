import Link from "next/link";
import { createPaymentBatchAction } from "@/modules/procure-to-pay/governance-actions";
import { getPaymentWorkspace } from "@/modules/procure-to-pay/governance-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PaymentBatchesPage() {
  const { paymentReadyInvoices, batches } = await getPaymentWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Payment governance
      </p>
      <h1 className="mt-3 text-4xl font-black">Payment batches</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Prepare approved invoices for ERP or banking handoff. Enorsis records
        authorization and export readiness but does not transmit funds.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create payment batch</h2>
        <form action={createPaymentBatchAction} className="mt-5">
          <div className="space-y-3">
            {paymentReadyInvoices.map((invoice) => (
              <label
                key={invoice.id}
                className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <input
                  name="invoiceIds"
                  type="checkbox"
                  value={invoice.id}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-black">
                    {invoice.invoiceNumber} ·{" "}
                    {invoice.supplier.tradingName ??
                      invoice.supplier.legalName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.purchaseOrder?.purchaseOrderNumber ?? "No PO"} · Due{" "}
                    {invoice.dueDate?.toLocaleDateString() ?? "not set"}
                  </p>
                </div>
                <p className="font-black text-blue-700">
                  {invoice.currencyCode} {invoice.totalAmount.toString()}
                </p>
              </label>
            ))}

            {paymentReadyInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">
                No unbatched payment-ready invoices are available.
              </p>
            ) : null}
          </div>

          {paymentReadyInvoices.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold">
                Planned payment date
                <input className={input} name="paymentDate" type="date" />
              </label>
              <label className="text-sm font-bold">
                Batch description
                <input className={input} name="description" />
              </label>
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
                Create batch
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {batches.map((batch) => (
          <article key={batch.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {batch.batchNumber} · {batch.status}
            </p>
            <h2 className="mt-2 text-xl font-black">
              {batch.invoiceCount} invoices
            </h2>
            <p className="mt-3 text-2xl font-black">
              {batch.currencyCode} {batch.totalAmount.toString()}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              USD reporting: {batch.totalUsdEquivalent.toString()}
            </p>
            <Link
              href={`/app/purchasing/payments/${batch.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Open payment batch
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
