import Link from "next/link";
import {
  issuePurchaseOrderAction,
  postReceiptAction,
  submitSupplierInvoiceAction,
} from "@/modules/procure-to-pay/actions";
import { getPurchaseOrderDetail } from "@/modules/procure-to-pay/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { order } = await getPurchaseOrderDetail(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/purchasing/orders" className="font-black text-blue-700">
        ← Purchase orders
      </Link>
      <h1 className="mt-5 text-4xl font-black">{order.title}</h1>
      <p className="mt-2 text-slate-600">
        {order.purchaseOrderNumber} · {order.status}
      </p>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Supplier</p>
            <p className="font-black">
              {order.supplier.tradingName ?? order.supplier.legalName}
            </p>
          </div>
          <p className="text-2xl font-black">
            {order.currencyCode} {order.totalAmount.toString()}
          </p>
        </div>

        {order.status === "DRAFT" ? (
          <form action={issuePurchaseOrderAction} className="mt-5">
            <input type="hidden" name="purchaseOrderId" value={order.id} />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Approve and issue order
            </button>
          </form>
        ) : null}
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Order lines</h2>
        <table className="mt-5 w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Line</th>
              <th className="p-3">Description</th>
              <th className="p-3">Ordered</th>
              <th className="p-3">Received</th>
              <th className="p-3">Unit price</th>
              <th className="p-3">Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="p-3">{line.lineNumber}</td>
                <td className="p-3 font-semibold">{line.description}</td>
                <td className="p-3">
                  {line.quantity.toString()} {line.unitOfMeasure}
                </td>
                <td className="p-3">{line.receivedQuantity.toString()}</td>
                <td className="p-3">{line.unitPrice.toString()}</td>
                <td className="p-3 font-black">{line.lineTotal.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {["ISSUED", "PARTIALLY_RECEIVED"].includes(order.status) ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className={card}>
            <h2 className="text-xl font-black">Post receipt</h2>
            <form action={postReceiptAction} className="mt-5 grid gap-3">
              <input type="hidden" name="purchaseOrderId" value={order.id} />
              <select className={input} name="type" defaultValue="GOODS">
                <option value="GOODS">Goods receipt</option>
                <option value="SERVICE">Service acceptance</option>
              </select>
              <input className={input} name="receivedAt" type="datetime-local" required />
              <input className={input} name="deliveryReference" placeholder="Delivery reference" />
              {order.lines.map((line) => (
                <label key={line.id} className="text-sm font-bold">
                  {line.description}
                  <input
                    className={input}
                    name={`quantity_${line.id}`}
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="Quantity received"
                  />
                </label>
              ))}
              <textarea className={`${input} min-h-24`} name="notes" placeholder="Receipt notes" />
              <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                Post receipt
              </button>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-xl font-black">Submit supplier invoice</h2>
            <form action={submitSupplierInvoiceAction} className="mt-5 grid gap-3">
              <input type="hidden" name="purchaseOrderId" value={order.id} />
              <input className={input} name="invoiceNumber" placeholder="Supplier invoice number" required />
              <input className={input} name="invoiceDate" type="date" required />
              <input className={input} name="dueDate" type="date" />
              <input className={input} name="taxAmount" type="number" step="0.01" placeholder="Tax amount" />
              {order.lines.map((line) => (
                <div key={line.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                  <p className="font-black md:col-span-2">{line.description}</p>
                  <input
                    className={input}
                    name={`quantity_${line.id}`}
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="Invoice quantity"
                  />
                  <input
                    className={input}
                    name={`unitPrice_${line.id}`}
                    type="number"
                    min="0"
                    step="0.0001"
                    defaultValue={line.unitPrice.toString()}
                    placeholder="Invoice unit price"
                  />
                </div>
              ))}
              <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                Submit invoice
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
