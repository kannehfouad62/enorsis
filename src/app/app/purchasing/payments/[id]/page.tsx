import Link from "next/link";
import {
  approvePaymentBatchAction,
  completePaymentBatchAction,
  submitPaymentBatchAction,
} from "@/modules/procure-to-pay/governance-actions";
import { getPaymentBatchDetail } from "@/modules/procure-to-pay/governance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PaymentBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, batch } = await getPaymentBatchDetail(id);

  const canApprove = session.user.roles.some((role) =>
    ["FINANCE", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/app/purchasing/payments"
        className="font-black text-blue-700"
      >
        ← Payment batches
      </Link>
      <h1 className="mt-5 text-4xl font-black">{batch.batchNumber}</h1>
      <p className="mt-2 text-slate-600">
        {batch.status} · {batch.invoiceCount} invoices
      </p>

      <section className={`${card} mt-8`}>
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Currency" value={batch.currencyCode} />
          <Summary label="Total" value={batch.totalAmount.toString()} />
          <Summary
            label="USD equivalent"
            value={batch.totalUsdEquivalent.toString()}
          />
          <Summary
            label="Payment date"
            value={batch.paymentDate?.toLocaleDateString() ?? "Not set"}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {batch.status === "DRAFT" ? (
            <form action={submitPaymentBatchAction}>
              <input type="hidden" name="batchId" value={batch.id} />
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
                Submit for finance approval
              </button>
            </form>
          ) : null}

          {batch.status === "PENDING_APPROVAL" && canApprove ? (
            <form action={approvePaymentBatchAction}>
              <input type="hidden" name="batchId" value={batch.id} />
              <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
                Approve payment batch
              </button>
            </form>
          ) : null}

          {batch.status === "APPROVED" || batch.status === "EXPORTED" ? (
            <>
              <a
                href={`/api/purchasing/payments/${batch.id}/export`}
                className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
              >
                Export ERP payment file
              </a>
              {canApprove ? (
                <form
                  action={completePaymentBatchAction}
                  className="flex flex-wrap gap-3"
                >
                  <input type="hidden" name="batchId" value={batch.id} />
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-3"
                    name="exportReference"
                    placeholder="ERP or bank reference"
                  />
                  <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
                    Mark batch completed
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Included invoices</h2>
        <table className="mt-5 w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Purchase order</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3 font-black">
                  {item.supplierInvoice.invoiceNumber}
                </td>
                <td className="p-3">
                  {item.supplierInvoice.supplier.tradingName ??
                    item.supplierInvoice.supplier.legalName}
                </td>
                <td className="p-3">
                  {item.supplierInvoice.purchaseOrder?.purchaseOrderNumber ??
                    "No PO"}
                </td>
                <td className="p-3">
                  {batch.currencyCode} {item.amount.toString()}
                </td>
                <td className="p-3">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
