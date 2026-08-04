import Link from "next/link";
import {
  markInvoicePaymentReadyAction,
  runThreeWayMatchAction,
} from "@/modules/procure-to-pay/actions";
import { getInvoiceDetail } from "@/modules/procure-to-pay/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function SupplierInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { invoice } = await getInvoiceDetail(id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/app/purchasing/invoices" className="font-black text-blue-700">
        ← Supplier invoices
      </Link>
      <h1 className="mt-5 text-4xl font-black">
        Invoice {invoice.invoiceNumber}
      </h1>
      <p className="mt-2 text-slate-600">
        {invoice.supplier.tradingName ?? invoice.supplier.legalName} ·{" "}
        {invoice.status}
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Amount" value={`${invoice.currencyCode} ${invoice.totalAmount.toString()}`} />
          <Summary label="Match status" value={invoice.matchStatus} />
          <Summary label="Due date" value={invoice.dueDate?.toLocaleDateString() ?? "Not set"} />
          <Summary label="Open exceptions" value={String(invoice.exceptions.filter((item) => item.status === "OPEN").length)} />
        </div>

        {invoice.status !== "PAYMENT_READY" && invoice.status !== "PAID" ? (
          <form action={runThreeWayMatchAction} className="mt-6 grid gap-4 md:grid-cols-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="text-sm font-bold">
              Quantity tolerance %
              <input className={input} name="quantityTolerance" type="number" min="0" step="0.1" defaultValue="0" />
            </label>
            <label className="text-sm font-bold">
              Price tolerance %
              <input className={input} name="priceTolerance" type="number" min="0" step="0.1" defaultValue="0" />
            </label>
            <button className="self-end rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
              Run three-way match
            </button>
          </form>
        ) : null}

        {invoice.status === "APPROVED" ? (
          <form action={markInvoicePaymentReadyAction} className="mt-5">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
              Mark payment ready
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Match exceptions</h2>
        <div className="mt-5 space-y-3">
          {invoice.exceptions.map((exception) => (
            <article key={exception.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-red-700">
                {exception.type} · Severity {exception.severity}
              </p>
              <p className="mt-2 font-black">{exception.description}</p>
              <p className="mt-2 text-sm text-slate-500">
                Expected: {exception.expectedValue?.toString() ?? "—"} · Actual:{" "}
                {exception.actualValue?.toString() ?? "—"} · Variance:{" "}
                {exception.variance?.toString() ?? "—"}
              </p>
            </article>
          ))}

          {invoice.exceptions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No match exceptions are recorded.
            </p>
          ) : null}
        </div>
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
