import {
  createInventoryTraceUnitAction,
  markExpiredTraceUnitsAction,
  recordInventoryTraceEventAction,
  releaseInventoryTraceHoldAction,
} from "@/modules/inventory-traceability/actions";
import { getInventoryTraceabilityWorkspace } from "@/modules/inventory-traceability/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function InventoryTraceabilityPage() {
  const data = await getInventoryTraceabilityWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B2.5
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Lot, Serial, Expiry & Traceability Control
      </h1>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-black">Create trace unit</h2>
          <form action={markExpiredTraceUnitsAction}>
            <button className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white">
              Scan for expired stock
            </button>
          </form>
        </div>

        <form
          action={createInventoryTraceUnitAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Trace type</span>
            <select className={input} name="unitType">
              <option>LOT</option>
              <option>SERIAL</option>
            </select>
          </label>
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="lotNumber" label="Lot number" />
          <Field name="serialNumber" label="Serial number" />
          <Field name="currentLocationId" label="Current location ID" />
          <Field name="quantity" label="Quantity" type="number" value="1" />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Field name="manufactureDate" label="Manufacture date" type="date" />
          <Field name="receivedDate" label="Received date" type="date" />
          <Field name="expiryDate" label="Expiry date" type="date" />
          <Field name="supplierId" label="Supplier ID" />
          <Field name="sourceReferenceType" label="Source reference type" />
          <Field name="sourceReferenceId" label="Source reference ID" />
          <Field name="notes" label="Notes" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create trace unit
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Record trace event</h2>
        <form
          action={recordInventoryTraceEventAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Trace unit</span>
            <select className={input} name="traceUnitId" required>
              <option value="">Select trace unit</option>
              {data.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.traceNumber} — {unit.inventoryItemId} —{" "}
                  {unit.lotNumber ?? unit.serialNumber ?? "No identifier"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold">Event type</span>
            <select className={input} name="eventType">
              <option>RECEIVED</option>
              <option>PUTAWAY</option>
              <option>TRANSFERRED</option>
              <option>RESERVED</option>
              <option>PICKED</option>
              <option>ISSUED</option>
              <option>ADJUSTED</option>
              <option>QUARANTINED</option>
              <option>RECALLED</option>
              <option>EXPIRED</option>
              <option>SCRAPPED</option>
              <option>COUNTED</option>
            </select>
          </label>
          <Field name="movementLedgerId" label="Movement ledger ID" />
          <Field name="referenceType" label="Reference type" />
          <Field name="referenceId" label="Reference ID" />
          <Field name="fromLocationId" label="From location ID" />
          <Field name="toLocationId" label="To location ID" />
          <Field name="quantity" label="Quantity" type="number" />
          <Field name="notes" label="Notes" />
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
            Record trace event
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Trace units</h2>
          <div className="mt-5 space-y-4">
            {data.units.map((unit) => (
              <article key={unit.id} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-black text-blue-700">{unit.status}</p>
                <h3 className="mt-2 text-lg font-black">{unit.traceNumber}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {unit.inventoryItemId} · {unit.unitType} ·{" "}
                  {unit.lotNumber ?? unit.serialNumber ?? "No identifier"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Location {unit.currentLocationId ?? "Not assigned"} · Qty{" "}
                  {unit.quantity.toString()} {unit.unitOfMeasure}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Expiry{" "}
                  {unit.expiryDate
                    ? unit.expiryDate.toLocaleDateString()
                    : "Not specified"}
                </p>

                <div className="mt-4 space-y-2">
                  {unit.events.slice(0, 5).map((event) => (
                    <div key={event.id} className="rounded-xl bg-white p-3 text-xs">
                      <span className="font-black">{event.eventType}</span>{" "}
                      · {event.eventAt.toLocaleString()}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Active traceability holds</h2>
          <div className="mt-5 space-y-4">
            {data.holds.map((hold) => (
              <article key={hold.id} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-black text-red-700">
                  {hold.holdType}
                </p>
                <h3 className="mt-2 font-black">{hold.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {hold.traceUnit.traceNumber} · {hold.traceUnit.inventoryItemId}
                </p>
                <form
                  action={releaseInventoryTraceHoldAction}
                  className="mt-4 flex gap-2"
                >
                  <input type="hidden" name="holdId" value={hold.id} />
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="releaseReason"
                    placeholder="Release reason"
                    required
                  />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Release hold
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  value,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input
        className={input}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
