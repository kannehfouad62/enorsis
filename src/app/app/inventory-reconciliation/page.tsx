import {
  approveInventoryReconciliationAction,
  completeInventoryCountSessionAction,
  createInventoryCountSessionAction,
  postInventoryReconciliationAction,
  recordInventoryCountLineAction,
} from "@/modules/inventory-reconciliation/actions";
import { getInventoryReconciliationWorkspace } from "@/modules/inventory-reconciliation/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function InventoryReconciliationPage() {
  const data = await getInventoryReconciliationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B2.4
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Cycle Counting, Inventory Reconciliation & Stock Adjustments
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create count session</h2>
        <form
          action={createInventoryCountSessionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="countType" label="Count type" value="CYCLE_COUNT" />
          <Field name="locationId" label="Location ID" />
          <Field name="notes" label="Notes" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Start count
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Record physical count</h2>
        <form
          action={recordInventoryCountLineAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Count session</span>
            <select className={input} name="countSessionId" required>
              <option value="">Select session</option>
              {data.sessions
                .filter((session) =>
                  ["DRAFT", "IN_PROGRESS", "REVIEW_REQUIRED"].includes(
                    session.status,
                  ),
                )
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.countNumber} — {session.status}
                  </option>
                ))}
            </select>
          </label>
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="locationId" label="Location ID" required />
          <Field name="countedQuantity" label="Counted quantity" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Field name="serialLotReference" label="Serial / lot reference" />
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
            Record count
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Count sessions</h2>
        <div className="mt-5 space-y-4">
          {data.sessions.map((session) => (
            <article key={session.id} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-blue-700">
                    {session.status}
                  </p>
                  <h3 className="mt-2 text-lg font-black">
                    {session.countNumber}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {session.countType ?? "COUNT"} · {session.locationId ?? "Multiple locations"}
                  </p>
                </div>
                {["DRAFT", "IN_PROGRESS"].includes(session.status) ? (
                  <form action={completeInventoryCountSessionAction}>
                    <input type="hidden" name="countSessionId" value={session.id} />
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                      Complete count
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {session.lines.map((line) => (
                  <div key={line.id} className="rounded-xl bg-white p-3 text-sm">
                    <p className="font-black">
                      {line.inventoryItemId} · {line.locationId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Expected {line.expectedQuantity.toString()} · Counted{" "}
                      {line.countedQuantity.toString()} · Variance{" "}
                      {line.varianceQuantity.toString()} · {line.status}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Reconciliation queue</h2>
        <div className="mt-5 space-y-4">
          {data.reconciliations.map((item) => (
            <article key={item.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{item.status}</p>
              <h3 className="mt-2 text-lg font-black">
                {item.reconciliationNumber}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {item.countLine.inventoryItemId} · {item.countLine.locationId} ·{" "}
                {item.direction} {item.varianceQuantity.toString()}
              </p>

              {["OPEN", "REVIEWING"].includes(item.status) ? (
                <form
                  action={approveInventoryReconciliationAction}
                  className="mt-4 flex gap-2"
                >
                  <input type="hidden" name="reconciliationId" value={item.id} />
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="reason"
                    placeholder="Approval reason"
                    required
                  />
                  <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">
                    Approve
                  </button>
                </form>
              ) : null}

              {item.status === "APPROVED" ? (
                <form action={postInventoryReconciliationAction} className="mt-4">
                  <input type="hidden" name="reconciliationId" value={item.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Post stock adjustment
                  </button>
                </form>
              ) : null}
            </article>
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
