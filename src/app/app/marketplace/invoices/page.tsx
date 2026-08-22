import Link from "next/link";

import {
  AgingChart,
  BuyerConcentrationChart,
  InvoiceStatusChart,
  RevenueTrendChart,
} from "@/components/supplier-finance/SupplierFinanceCharts";
import { getSupplierFinanceIntelligence } from "@/modules/supplier-finance/queries";

const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function currency(code: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value);
}

export default async function SupplierFinancePage() {
  const data = await getSupplierFinanceIntelligence();
  const code = data.tenant.baseCurrencyCode;
  const metrics = [
    { label: "Invoiced sales", value: currency(code, data.metrics.invoicedSales), note: "Submitted and downstream invoices" },
    { label: "Paid revenue", value: currency(code, data.metrics.paidRevenue), note: `${data.metrics.paidInvoiceCount} paid invoice(s)` },
    { label: "Outstanding receivables", value: currency(code, data.metrics.outstandingReceivables), note: "Awaiting buyer/payment completion" },
    { label: "Overdue receivables", value: currency(code, data.metrics.overdueReceivables), note: "Past contractual due date" },
    { label: "Draft pipeline", value: currency(code, data.metrics.draftPipeline), note: "Supplier-private invoice drafts" },
    { label: "Collection rate", value: `${data.metrics.collectionRate.toFixed(1)}%`, note: "Paid revenue / invoiced sales" },
    { label: "Average invoice", value: currency(code, data.metrics.averageInvoice), note: `${data.metrics.invoiceCount} invoice(s) tracked` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Supplier commercial intelligence</p>
          <h1 className="mt-3 text-4xl font-black">Finance, Sales & Revenue Intelligence</h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">Turn marketplace invoices into revenue, receivables, collections and buyer-concentration intelligence.</p>
        </div>
        <Link href="/app/marketplace/orders" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-blue-700">Marketplace orders</Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className={card}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-black">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-400">{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">12-month sales & revenue trend</h2>
          <p className="mt-2 text-sm text-slate-500">Compare invoiced sales against invoices recorded as paid.</p>
          <div className="mt-5"><RevenueTrendChart data={data.monthly} /></div>
        </section>
        <section className={card}>
          <h2 className="text-xl font-black">Invoice status value mix</h2>
          <p className="mt-2 text-sm text-slate-500">See where invoice value sits across draft, matching, payment-ready, exception and paid stages.</p>
          <div className="mt-5"><InvoiceStatusChart data={data.statuses} /></div>
        </section>
        <section className={card}>
          <h2 className="text-xl font-black">Receivables aging</h2>
          <p className="mt-2 text-sm text-slate-500">Outstanding invoice value grouped by days past due.</p>
          <div className="mt-5"><AgingChart data={data.aging} /></div>
        </section>
        <section className={card}>
          <h2 className="text-xl font-black">Buyer revenue concentration</h2>
          <p className="mt-2 text-sm text-slate-500">Top buyers ranked by cumulative invoiced sales.</p>
          <div className="mt-5"><BuyerConcentrationChart data={data.buyers} /></div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Decision intelligence</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {data.insights.map((insight) => (
            <article key={`${insight.severity}-${insight.title}`} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{insight.severity}</p>
              <h3 className="mt-2 font-black">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{insight.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">
              Payments & remittances
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Buyer payments that have completed settlement and are
              available for reconciliation.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {data.remittances.length} settled
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {data.remittances.length ? (
            data.remittances.map((remittance) => (
              <Link
                key={remittance.batchId}
                href={`/app/marketplace/remittances/${remittance.batchId}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-black text-slate-950">
                    {remittance.batchNumber}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {remittance.invoiceCount} paid invoice
                    {remittance.invoiceCount === 1 ? "" : "s"}
                    {" · "}
                    {remittance.completedAt
                      ? remittance.completedAt.toLocaleDateString()
                      : "Settlement recorded"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ref {remittance.paymentReference ?? "—"}
                  </p>
                </div>
                <p className="font-black text-emerald-700">
                  {currency(
                    remittance.currencyCode,
                    remittance.amount,
                  )}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No settled buyer payments are available yet.
            </p>
          )}
        </div>
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Recent invoice performance</h2>
        <table className="mt-5 w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-3">Invoice</th><th className="pb-3">Buyer</th><th className="pb-3">Order</th><th className="pb-3">Status</th><th className="pb-3">Invoice date</th><th className="pb-3">Due date</th><th className="pb-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.recentInvoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="py-4 font-black">{invoice.invoiceNumber}</td>
                <td className="py-4">{invoice.buyerName}</td>
                <td className="py-4">{invoice.orderNumber}</td>
                <td className="py-4">{invoice.status.replaceAll("_", " ")}</td>
                <td className="py-4">{invoice.invoiceDate.toLocaleDateString()}</td>
                <td className="py-4">{invoice.dueDate?.toLocaleDateString() ?? "—"}</td>
                <td className="py-4 text-right font-black">{currency(invoice.currencyCode, invoice.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.recentInvoices.length === 0 ? <p className="mt-5 text-sm text-slate-500">No supplier-generated marketplace invoices are available yet.</p> : null}
      </section>
    </div>
  );
}
