import Link from "next/link";

import {
  acceptMarketplaceSellerOrderAction,
  rejectMarketplaceSellerOrderAction,
  shipMarketplaceSellerOrderAction,
} from "@/modules/marketplace-commerce/actions";
import {
  generateMarketplaceSupplierInvoiceAction,
  submitMarketplaceSupplierInvoiceAction,
} from "@/modules/marketplace-invoice-automation/actions";
import { getMarketplaceSellerOrders } from "@/modules/marketplace-commerce/queries";

type SnapshotLine = {
  offeringName?: string;
  sku?: string | null;
  quantity?: number;
  unitOfMeasure?: string;
  unitPrice?: number;
};

export default async function MarketplaceSellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    invoiceGenerated?: string;
    invoiceSubmitted?: string;
    invoiceError?: string;
  }>;
}) {
  const { orders } = await getMarketplaceSellerOrders();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Seller Marketplace</p>
      <h1 className="mt-3 text-4xl font-black">Marketplace Orders</h1>
      <p className="mt-3 max-w-4xl leading-7 text-slate-600">
        Review buyer purchase orders, accept or reject them, and record shipment details. Goods receipt remains buyer-controlled.
      </p>

      {params.invoiceGenerated ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
          Draft invoice {params.invoiceGenerated} was generated. Review the PDF before submitting it to the buyer.
        </div>
      ) : null}
      {params.invoiceSubmitted ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-900">
          Invoice {params.invoiceSubmitted} was submitted to the buyer.
        </div>
      ) : null}


      {params.invoiceError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-900">
          {params.invoiceError}
        </div>
      ) : null}
      <div className="mt-8 space-y-5">
        {orders.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="font-black">No marketplace orders yet.</p></div> : null}
        {orders.map((order) => {
          const lines = Array.isArray(order.lineSnapshot) ? (order.lineSnapshot as SnapshotLine[]) : [];
          return (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase text-slate-500">{order.orderNumber ?? "Order preparing"}</p><h2 className="mt-2 text-xl font-black">{order.buyerTenantName ?? "Marketplace buyer"}</h2></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{order.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-5 space-y-2">
                {lines.map((line, index) => (
                  <div key={index} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <span>{line.offeringName ?? "Marketplace item"}{line.sku ? ` · ${line.sku}` : ""}</span>
                    <span className="font-black">{line.quantity ?? 0} {line.unitOfMeasure ?? ""} · {order.currencyCode} {Number(line.unitPrice ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-right text-lg font-black">Total: {order.currencyCode} {Number(order.totalAmount).toLocaleString()}</p>

              {order.status === "PLACED" ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <form action={acceptMarketplaceSellerOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">Accept order</button>
                  </form>
                  <form action={rejectMarketplaceSellerOrderAction} className="flex gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input name="reason" required placeholder="Rejection reason" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-700">Reject</button>
                  </form>
                </div>
              ) : null}

              {order.status === "ACCEPTED" ? (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  {order.logisticsShipment ? (
                    <>
                      <div className="grid gap-3 text-sm md:grid-cols-4">
                        <p>
                          <strong>Shipment:</strong>{" "}
                          {order.logisticsShipment.shipmentNumber}
                        </p>
                        <p>
                          <strong>Carrier:</strong>{" "}
                          {order.logisticsShipment.carrier?.name ??
                            "Not assigned"}
                        </p>
                        <p>
                          <strong>Tracking:</strong>{" "}
                          {order.logisticsShipment.trackingNumber ??
                            "Pending"}
                        </p>
                        <p>
                          <strong>Freight:</strong>{" "}
                          {order.logisticsShipment.currencyCode}{" "}
                          {Number(
                            order.logisticsShipment.freightCost ??
                              0,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/app/logistics"
                          className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700"
                        >
                          Review Logistics shipment
                        </Link>

                        <form
                          action={
                            shipMarketplaceSellerOrderAction
                          }
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                            Mark shipped using Logistics
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-blue-950">
                        Configure the shipment in Logistics before
                        marking this marketplace order shipped.
                      </p>
                      <Link
                        href="/app/logistics"
                        className="mt-3 inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                      >
                        Configure shipment in Logistics
                      </Link>
                    </>
                  )}
                </div>
              ) : null}

              {order.status === "SHIPPED" ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
                  <p><strong>Carrier:</strong> {order.carrier}</p>
                  <p className="mt-1"><strong>Tracking:</strong> {order.trackingNumber}</p>
                  {order.logisticsShipment ? (
                    <p className="mt-1">
                      <strong>Freight:</strong>{" "}
                      {order.logisticsShipment.currencyCode}{" "}
                      {Number(
                        order.logisticsShipment.freightCost ?? 0,
                      ).toLocaleString()}
                    </p>
                  ) : null}
                  {!order.generatedInvoice ? (
                    <form
                      action={generateMarketplaceSupplierInvoiceAction}
                      className="mt-4"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <button className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
                        Generate draft invoice
                      </button>
                      <p className="mt-2 text-xs text-slate-500">
                        Enorsis uses the fully accepted receipt and linked
                        Logistics freight cost. The buyer cannot see this
                        draft until you explicitly submit it.
                      </p>
                    </form>
                  ) : (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-black">
                        {order.generatedInvoice.invoiceNumber} ·{" "}
                        {order.generatedInvoice.status}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {order.generatedInvoice.pdfBlobPathname ? (
                          <a
                            href={`/api/invoices/${order.generatedInvoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-blue-700"
                          >
                            Preview PDF invoice
                          </a>
                        ) : (
                          <span className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
                            PDF generation pending
                          </span>
                        )}

                        {order.generatedInvoice.status === "DRAFT" ? (
                          <form action={submitMarketplaceSupplierInvoiceAction}>
                            <input
                              type="hidden"
                              name="invoiceId"
                              value={order.generatedInvoice.id}
                            />
                            <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                              Submit invoice to buyer
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
