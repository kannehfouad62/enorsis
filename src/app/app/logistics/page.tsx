import {
  addTrackingEventAction,
  createCarrierAction,
  createMarketplaceShipmentAction,
  createShipmentAction,
  updateProofOfDeliveryAction,
} from "@/modules/logistics/actions";
import { getLogisticsWorkspace } from "@/modules/logistics/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function LogisticsPage() {
  const data = await getLogisticsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Inbound logistics
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Logistics & Freight
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Manage carriers, shipments, freight cost, delivery risk,
        tracking events and proof of delivery.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active shipments" value={data.metrics.activeShipments} />
        <Metric label="Delayed shipments" value={data.metrics.delayedShipments} />
        <Metric label="Overdue deliveries" value={data.metrics.overdueDeliveries} />
        <Metric label="Freight spend" value={data.metrics.freightSpend} money />
        <Metric label="High-risk shipments" value={data.metrics.highRiskShipments} />
        <Metric label="Missing POD" value={data.metrics.deliveredWithoutPod} />
      </div>

      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">
              Marketplace linkage
            </p>
            <h2 className="mt-2 text-xl font-black">
              Accepted marketplace orders
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Accepted marketplace orders are linked through their
              governed purchase-order execution. Configure shipment details
              here once; later stages will synchronize these details back to
              Marketplace Orders and invoice freight.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            STAGE 2 - SHIPMENT SETUP
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {data.marketplaceOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {order.orderNumber ?? "Order preparing"}
                  </p>
                  <h3 className="mt-2 font-black">
                    {order.buyerTenantName ?? "Marketplace buyer"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Governed PO execution:{" "}
                    {order.purchaseOrderExecutionId ?? "Not linked yet"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black">
                    {order.currencyCode}{" "}
                    {Number(order.totalAmount).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Accepted{" "}
                    {order.acceptedAt
                      ? order.acceptedAt.toLocaleString()
                      : "recently"}
                  </p>
                </div>
              </div>

              {order.logisticsShipment ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase text-emerald-700">
                    Shipment configured
                  </p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                    <p>
                      <strong>Shipment:</strong>{" "}
                      {order.logisticsShipment.shipmentNumber}
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
                        order.logisticsShipment.freightCost ?? 0,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-emerald-800">
                    Stage 2 stores this shipment against the governed
                    purchase-order execution. Marketplace shipping is
                    not yet automatically advanced.
                  </p>
                </div>
              ) : order.purchaseOrderExecutionId ? (
                <form
                  action={createMarketplaceShipmentAction}
                  className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <input
                    type="hidden"
                    name="marketplaceOrderId"
                    value={order.id}
                  />

                  <label className="text-xs font-black text-slate-600">
                    Carrier
                    <select
                      className={input}
                      name="carrierId"
                      required
                    >
                      <option value="">Select carrier</option>
                      {data.carriers.map((carrier) => (
                        <option
                          key={carrier.id}
                          value={carrier.id}
                        >
                          {carrier.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Mode
                    <select className={input} name="mode">
                      <option>ROAD</option>
                      <option>AIR</option>
                      <option>OCEAN</option>
                      <option>RAIL</option>
                      <option>COURIER</option>
                      <option>MULTIMODAL</option>
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Origin
                    <input
                      className={input}
                      name="origin"
                      required
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Destination
                    <input
                      className={input}
                      name="destination"
                      required
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Tracking number
                    <input
                      className={input}
                      name="trackingNumber"
                      required
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Freight / shipping cost
                    <input
                      className={input}
                      name="freightCost"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Currency
                    <input
                      className={input}
                      name="currencyCode"
                      defaultValue={order.currencyCode}
                      required
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Incoterm
                    <input className={input} name="incoterm" />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Pickup
                    <input
                      className={input}
                      name="pickupAt"
                      type="datetime-local"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Estimated delivery
                    <input
                      className={input}
                      name="estimatedDeliveryAt"
                      type="datetime-local"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Weight
                    <input
                      className={input}
                      name="weight"
                      type="number"
                      min="0"
                      step="0.0001"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Weight unit
                    <input
                      className={input}
                      name="weightUnit"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Packages
                    <input
                      className={input}
                      name="packageCount"
                      type="number"
                      min="0"
                      defaultValue="0"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-600">
                    Delay risk %
                    <input
                      className={input}
                      name="delayRiskPercent"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="0"
                    />
                  </label>

                  <div className="flex items-end md:col-span-2">
                    <button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
                      Save marketplace shipment
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Shipment setup will become available after the
                  governed purchase-order execution is linked.
                </div>
              )}
            </article>
          ))}

          {data.marketplaceOrders.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No accepted marketplace orders are currently awaiting
              logistics planning.
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create carrier</h2>
          <form action={createCarrierAction} className="mt-5 grid gap-3">
            <input className={input} name="code" placeholder="Carrier code" required />
            <input className={input} name="name" placeholder="Carrier name" required />
            <input className={input} name="contactName" placeholder="Contact name" />
            <input className={input} name="contactEmail" type="email" placeholder="Contact email" />
            <input className={input} name="contactPhone" placeholder="Contact phone" />
            <input className={input} name="scacCode" placeholder="SCAC code" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create carrier
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Create shipment</h2>
          <form action={createShipmentAction} className="mt-5 grid gap-3">
            <input className={input} name="purchaseOrderId" placeholder="Purchase order ID" />
            <select className={input} name="supplierId">
              <option value="">No linked supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <select className={input} name="carrierId">
              <option value="">No carrier assigned</option>
              {data.carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            <select className={input} name="mode">
              <option>ROAD</option>
              <option>AIR</option>
              <option>OCEAN</option>
              <option>RAIL</option>
              <option>COURIER</option>
              <option>MULTIMODAL</option>
            </select>
            <input className={input} name="origin" placeholder="Origin" required />
            <input className={input} name="destination" placeholder="Destination" required />
            <input className={input} name="trackingNumber" placeholder="Tracking number" />
            <input className={input} name="incoterm" placeholder="Incoterm" />
            <input className={input} name="pickupAt" type="datetime-local" />
            <input className={input} name="estimatedDeliveryAt" type="datetime-local" />
            <input className={input} name="freightCost" type="number" step="0.01" placeholder="Freight cost" />
            <input className={input} name="currencyCode" defaultValue="USD" />
            <input className={input} name="weight" type="number" step="0.0001" placeholder="Weight" />
            <input className={input} name="weightUnit" placeholder="Weight unit" />
            <input className={input} name="packageCount" type="number" min="0" defaultValue="0" />
            <input className={input} name="delayRiskPercent" type="number" min="0" max="100" defaultValue="0" />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Create shipment
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Shipment control tower</h2>
        <div className="mt-5 space-y-5">
          {data.shipments.map((shipment) => (
            <article key={shipment.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {shipment.shipmentNumber} · {shipment.mode} · {shipment.status}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {shipment.origin} → {shipment.destination}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Carrier {shipment.carrier?.name ?? "Unassigned"} · Freight $
                {Number(shipment.freightCost ?? 0).toLocaleString()} · Risk{" "}
                {shipment.delayRiskPercent}%
              </p>

              <form action={addTrackingEventAction} className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <input type="hidden" name="shipmentId" value={shipment.id} />
                <select className={input} name="type">
                  <option>BOOKED</option>
                  <option>PICKED_UP</option>
                  <option>DEPARTED</option>
                  <option>ARRIVED</option>
                  <option>CUSTOMS_HOLD</option>
                  <option>DELAYED</option>
                  <option>OUT_FOR_DELIVERY</option>
                  <option>DELIVERED</option>
                  <option>EXCEPTION</option>
                </select>
                <input className={input} name="occurredAt" type="datetime-local" required />
                <input className={input} name="location" placeholder="Location" />
                <input className={input} name="source" placeholder="Source" />
                <input className={input} name="description" placeholder="Event description" required />
                <input className={input} name="evidenceUrl" type="url" placeholder="Evidence URL" />
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                  Add event
                </button>
              </form>

              <form action={updateProofOfDeliveryAction} className="mt-4 flex flex-col gap-3 md:flex-row">
                <input type="hidden" name="shipmentId" value={shipment.id} />
                <input className={input} name="proofOfDeliveryUrl" type="url" placeholder="Proof-of-delivery URL" required />
                <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                  Save POD
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  money = false,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {money ? `$${value.toLocaleString()}` : value}
      </p>
    </article>
  );
}
