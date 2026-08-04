import Link from "next/link";
import { createPurchaseOrderFromRequestAction } from "@/modules/procure-to-pay/actions";
import { getPurchasingWorkspace } from "@/modules/procure-to-pay/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PurchaseOrdersPage() {
  const { orders, approvedRequests, suppliers } =
    await getPurchasingWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Procure to pay
      </p>
      <h1 className="mt-3 text-4xl font-black">Purchase orders</h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Convert approved request to purchase order
        </h2>
        <form
          action={createPurchaseOrderFromRequestAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-sm font-bold">
            Approved request
            <select className={input} name="purchaseRequestId" required>
              <option value="">Select request</option>
              {approvedRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNumber} · {request.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Supplier
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Tax amount
            <input className={input} name="taxAmount" type="number" step="0.01" />
          </label>
          <label className="text-sm font-bold">
            Requested delivery
            <input className={input} name="requestedDeliveryDate" type="date" />
          </label>
          <label className="text-sm font-bold">
            Payment terms
            <input className={input} name="paymentTerms" />
          </label>
          <label className="text-sm font-bold md:col-span-2">
            Delivery address
            <textarea className={`${input} min-h-24`} name="deliveryAddress" />
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create purchase order
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {orders.map((order) => (
          <article key={order.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {order.purchaseOrderNumber} · {order.status}
            </p>
            <h2 className="mt-2 text-xl font-black">{order.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {order.supplier.tradingName ?? order.supplier.legalName}
            </p>
            <p className="mt-3 font-black">
              {order.currencyCode} {order.totalAmount.toString()}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {order.receipts.length} receipts · {order.invoices.length} invoices
            </p>
            <Link
              href={`/app/purchasing/orders/${order.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Open purchase order
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
