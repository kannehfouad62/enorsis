import {
  allocateWarehouseFulfillmentOrderAction,
  completeWarehousePickTaskAction,
  createWarehouseFulfillmentOrderAction,
  issueWarehouseFulfillmentOrderAction,
  packWarehouseFulfillmentOrderAction,
  resolveWarehouseFulfillmentExceptionAction,
} from "@/modules/warehouse-fulfillment/actions";
import { getWarehouseFulfillmentWorkspace } from "@/modules/warehouse-fulfillment/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WarehouseFulfillmentPage() {
  const data = await getWarehouseFulfillmentWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Picking, Packing, Issue & Internal Fulfillment
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create fulfillment order</h2>
        <form
          action={createWarehouseFulfillmentOrderAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="requestType" label="Request type" value="INTERNAL_REQUEST" />
          <Field name="requestId" label="Request ID" />
          <Field name="destinationType" label="Destination type" />
          <Field name="destinationId" label="Destination ID" />
          <Field name="neededAt" label="Needed at" type="date" />
          <Field name="lineReference" label="Line reference" required />
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="sourceLocationId" label="Source location ID" required />
          <Field name="requestedQuantity" label="Requested quantity" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Field name="serialLotReference" label="Serial / lot reference" />
          <Field name="notes" label="Notes" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create fulfillment
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Fulfillment orders</h2>
        <div className="mt-5 space-y-4">
          {data.orders.map((order) => (
            <article key={order.id} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-blue-700">{order.status}</p>
                  <h3 className="mt-2 text-lg font-black">
                    {order.fulfillmentNumber}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.requestType ?? "Request"} · {order.requestId ?? "No reference"}
                  </p>
                </div>

                {order.status === "DRAFT" ? (
                  <form action={allocateWarehouseFulfillmentOrderAction}>
                    <input type="hidden" name="fulfillmentOrderId" value={order.id} />
                    <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                      Allocate
                    </button>
                  </form>
                ) : null}
              </div>

              {order.status === "PICKED" ? (
                <form
                  action={packWarehouseFulfillmentOrderAction}
                  className="mt-5 grid gap-3 md:grid-cols-3"
                >
                  <input type="hidden" name="fulfillmentOrderId" value={order.id} />
                  <Field name="packageType" label="Package type" />
                  <Field name="grossWeight" label="Gross weight" type="number" />
                  <Field name="weightUnit" label="Weight unit" value="LB" />
                  <Field name="carrierReference" label="Carrier reference" />
                  <Field name="trackingReference" label="Tracking reference" />
                  <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">
                    Pack
                  </button>
                </form>
              ) : null}

              {order.status === "PACKED" ? (
                <form action={issueWarehouseFulfillmentOrderAction} className="mt-5">
                  <input type="hidden" name="fulfillmentOrderId" value={order.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Issue inventory
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Pick queue</h2>
          <div className="mt-5 space-y-3">
            {data.tasks.map((task) => (
              <div key={task.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{task.taskNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.fulfillmentLine.inventoryItemId} ·{" "}
                  {task.requestedQuantity.toString()} {task.unitOfMeasure} from{" "}
                  {task.sourceLocationId}
                </p>
                {["OPEN", "IN_PROGRESS"].includes(task.status) ? (
                  <form
                    action={completeWarehousePickTaskAction}
                    className="mt-3 flex gap-2"
                  >
                    <input type="hidden" name="pickTaskId" value={task.id} />
                    <input
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      name="pickedQuantity"
                      type="number"
                      placeholder="Picked quantity"
                      required
                    />
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                      Complete pick
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Fulfillment exceptions</h2>
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
                    action={resolveWarehouseFulfillmentExceptionAction}
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
