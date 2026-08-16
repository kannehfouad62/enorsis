import {
  createInventoryMovementAction,
  createInventoryReservationAction,
  postInventoryMovementAction,
  resolveInventoryOperationExceptionAction,
} from "@/modules/inventory-operations/actions";
import { getInventoryOperationsWorkspace } from "@/modules/inventory-operations/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function InventoryOperationsPage() {
  const data = await getInventoryOperationsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Inventory Movement & Availability Control
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create movement</h2>
        <form
          action={createInventoryMovementAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Movement type</span>
            <select className={input} name="movementType">
              <option>RECEIPT</option>
              <option>ISSUE</option>
              <option>TRANSFER</option>
              <option>ADJUSTMENT_IN</option>
              <option>ADJUSTMENT_OUT</option>
              <option>RETURN</option>
              <option>SCRAP</option>
              <option>CYCLE_COUNT</option>
            </select>
          </label>
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="fromLocationId" label="From location ID" />
          <Field name="toLocationId" label="To location ID" />
          <Field name="quantity" label="Quantity" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Field name="unitCost" label="Unit cost" type="number" />
          <Field name="currencyCode" label="Currency" value="USD" />
          <Field name="referenceType" label="Reference type" />
          <Field name="referenceId" label="Reference ID" />
          <Field name="serialLotReference" label="Serial / lot reference" />
          <Field name="reason" label="Reason" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create movement
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Availability</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">On hand</th>
                <th className="px-3 py-2">Reserved</th>
                <th className="px-3 py-2">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.availability.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-black">{item.inventoryItemId}</td>
                  <td className="px-3 py-2">{item.locationId}</td>
                  <td className="px-3 py-2">{item.onHandQuantity.toString()}</td>
                  <td className="px-3 py-2">{item.reservedQuantity.toString()}</td>
                  <td className="px-3 py-2">{item.availableQuantity.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Reservations</h2>
          <form
            action={createInventoryReservationAction}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <Field name="inventoryItemId" label="Inventory item ID" required />
            <Field name="locationId" label="Location ID" required />
            <Field
              name="requestedQuantity"
              label="Requested quantity"
              type="number"
              required
            />
            <Field name="referenceType" label="Reference type" />
            <Field name="referenceId" label="Reference ID" />
            <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
              Reserve inventory
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Open exceptions</h2>
          <div className="mt-5 space-y-3">
            {data.exceptions
              .filter((item) =>
                ["OPEN", "INVESTIGATING"].includes(item.status),
              )
              .map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-black">
                    {item.severity} · {item.exceptionType}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.title}</p>
                  <form
                    action={resolveInventoryOperationExceptionAction}
                    className="mt-3 flex gap-2"
                  >
                    <input type="hidden" name="exceptionId" value={item.id} />
                    <input
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      name="resolution"
                      placeholder="Resolution"
                      required
                    />
                    <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                      Resolve
                    </button>
                  </form>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Movement ledger</h2>
        <div className="mt-5 space-y-3">
          {data.movements.map((movement) => (
            <div
              key={movement.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{movement.movementNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {movement.movementType} · {movement.inventoryItemId} ·{" "}
                  {movement.quantity.toString()} {movement.unitOfMeasure}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black">{movement.status}</span>
                {movement.status === "DRAFT" ? (
                  <form action={postInventoryMovementAction}>
                    <input
                      type="hidden"
                      name="movementId"
                      value={movement.id}
                    />
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                      Post
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
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
