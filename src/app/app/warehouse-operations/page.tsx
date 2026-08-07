import {
  completePutawayTaskAction,
  configureWarehouseLocationAction,
  createPutawayTaskAction,
  createWarehouseReceivingSessionAction,
  resolveWarehouseDiscrepancyAction,
} from "@/modules/warehouse-operations/actions";
import { getWarehouseOperationsWorkspace } from "@/modules/warehouse-operations/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WarehouseOperationsPage() {
  const data = await getWarehouseOperationsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B2.2
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Warehouse Receiving, Putaway & Location Control
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Receive shipment</h2>
        <form
          action={createWarehouseReceivingSessionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="sourceType" label="Source type" value="PURCHASE_ORDER" />
          <Field name="sourceId" label="Source ID" />
          <Field name="purchaseOrderId" label="Purchase order ID" />
          <Field name="goodsReceiptSessionId" label="Goods receipt session ID" />
          <Field name="supplierId" label="Supplier ID" />
          <Field name="dockLocationId" label="Dock location ID" />
          <Field name="carrierReference" label="Carrier reference" />
          <Field name="deliveryReference" label="Delivery reference" />
          <Field name="lineReference" label="Line reference" required />
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="description" label="Description" required />
          <Field name="expectedQuantity" label="Expected quantity" type="number" required />
          <Field name="receivedQuantity" label="Received quantity" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <label>
            <span className="text-sm font-bold">Condition</span>
            <select className={input} name="condition">
              <option>RECEIVED</option>
              <option>DAMAGED</option>
              <option>REJECTED</option>
              <option>QUARANTINED</option>
            </select>
          </label>
          <Field name="serialLotReference" label="Serial / lot reference" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Record receiving
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Location control</h2>
        <form
          action={configureWarehouseLocationAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="locationId" label="Inventory location ID" required />
          <Field name="warehouseCode" label="Warehouse" />
          <Field name="zoneCode" label="Zone" />
          <Field name="aisleCode" label="Aisle" />
          <Field name="binCode" label="Bin" />
          <Field name="capacityQuantity" label="Capacity quantity" type="number" />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Check name="allowsMixedItems" label="Allow mixed items" />
          <Check name="requiresLot" label="Lot required" />
          <Check name="requiresSerial" label="Serial required" />
          <Check name="quarantineOnly" label="Quarantine only" />
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
            Save location control
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create putaway task</h2>
          <form
            action={createPutawayTaskAction}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <Field name="receivingSessionId" label="Receiving session ID" required />
            <Field name="receiptLineId" label="Receipt line ID" required />
            <Field name="destinationControlId" label="Destination control ID" required />
            <Field name="quantity" label="Quantity" type="number" required />
            <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">
              Create putaway
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Open discrepancies</h2>
          <div className="mt-5 space-y-3">
            {data.discrepancies
              .filter((item) =>
                ["OPEN", "INVESTIGATING"].includes(item.status),
              )
              .map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-black">
                    {item.severity} · {item.discrepancyType}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.title}</p>
                  <form
                    action={resolveWarehouseDiscrepancyAction}
                    className="mt-3 flex gap-2"
                  >
                    <input type="hidden" name="discrepancyId" value={item.id} />
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
        <h2 className="text-xl font-black">Putaway queue</h2>
        <div className="mt-5 space-y-3">
          {data.tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{task.taskNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.receiptLine.description} · {task.quantity.toString()}{" "}
                  {task.unitOfMeasure} → {task.destinationControl.locationId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black">{task.status}</span>
                {["OPEN", "IN_PROGRESS"].includes(task.status) ? (
                  <form action={completePutawayTaskAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                      Complete putaway
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

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
      <input type="checkbox" name={name} />
      <span className="text-sm font-bold">{label}</span>
    </label>
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
