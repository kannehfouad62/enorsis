import Link from "next/link";
import { getInvoiceWorkspace } from "@/modules/procure-to-pay/queries";

export default async function SupplierInvoicesPage() {
  const { invoices } = await getInvoiceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Accounts payable
      </p>
      <h1 className="mt-3 text-4xl font-black">Supplier invoices</h1>

      <section className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Purchase order</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Match</th>
              <th className="p-3">Status</th>
              <th className="p-3">Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link
                    href={`/app/purchasing/invoices/${invoice.id}`}
                    className="font-black text-blue-700"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {invoice.invoiceDate.toLocaleDateString()}
                  </p>
                </td>
                <td className="p-3">
                  {invoice.supplier.tradingName ?? invoice.supplier.legalName}
                </td>
                <td className="p-3">
                  {invoice.purchaseOrder?.purchaseOrderNumber ?? "No PO"}
                </td>
                <td className="p-3 font-black">
                  {invoice.currencyCode} {invoice.totalAmount.toString()}
                </td>
                <td className="p-3">{invoice.matchStatus}</td>
                <td className="p-3">{invoice.status}</td>
                <td className="p-3">{invoice.exceptions.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
