import {
  approveInventoryFinancialReconciliationAction,
  createCostLayerFromMovementAction,
  createInventoryFinancialReconciliationAction,
  refreshInventoryFinancialValuationAction,
  upsertInventoryValuationPolicyAction,
} from "@/modules/inventory-financial-valuation/actions";
import { getInventoryFinancialValuationWorkspace } from "@/modules/inventory-financial-valuation/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function InventoryFinancialValuationPage() {
  const data = await getInventoryFinancialValuationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B2.7
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Inventory Valuation, Cost Layers & Financial Reconciliation
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Valuation policy</h2>
        <form
          action={upsertInventoryValuationPolicyAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="locationId" label="Location ID" />
          <label>
            <span className="text-sm font-bold">Cost method</span>
            <select className={input} name="costMethod">
              <option>WEIGHTED_AVERAGE</option>
              <option>FIFO</option>
              <option>STANDARD</option>
              <option>SPECIFIC_IDENTIFICATION</option>
            </select>
          </label>
          <Field name="standardUnitCost" label="Standard unit cost" type="number" />
          <Field name="currencyCode" label="Currency" value="USD" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Save valuation policy
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Inbound movement cost layers</h2>
        <div className="mt-5 space-y-3">
          {data.inboundMovements.map((movement) => (
            <div
              key={movement.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{movement.movementNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {movement.inventoryItemId} · {movement.quantity.toString()}{" "}
                  {movement.unitOfMeasure} · Unit cost{" "}
                  {movement.unitCost?.toString() ?? "Not set"}
                </p>
              </div>
              <form action={createCostLayerFromMovementAction}>
                <input type="hidden" name="movementId" value={movement.id} />
                <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  Create cost layer
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Financial valuation</h2>
          <div className="mt-5 space-y-3">
            {data.valuations.map((valuation) => (
              <article key={valuation.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">
                  {valuation.inventoryItemId} · {valuation.locationId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Qty {valuation.quantityOnHand.toString()} · Avg cost{" "}
                  {valuation.averageUnitCost.toString()} · Value{" "}
                  {valuation.currencyCode} {valuation.inventoryValue.toString()}
                </p>
                <form
                  action={refreshInventoryFinancialValuationAction}
                  className="mt-3"
                >
                  <input
                    type="hidden"
                    name="inventoryItemId"
                    value={valuation.inventoryItemId}
                  />
                  <input
                    type="hidden"
                    name="locationId"
                    value={valuation.locationId}
                  />
                  <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                    Refresh valuation
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Financial reconciliation</h2>
          <form
            action={createInventoryFinancialReconciliationAction}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <Field name="inventoryItemId" label="Inventory item ID" required />
            <Field name="locationId" label="Location ID" required />
            <Field name="expectedValue" label="Expected financial value" type="number" required />
            <Field name="reason" label="Reason / GL reference" />
            <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">
              Reconcile value
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {data.reconciliations.map((item) => (
              <article key={item.id} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black text-blue-700">{item.status}</p>
                <p className="mt-1 font-black">{item.reconciliationNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Ledger {item.currencyCode} {item.ledgerValue.toString()} · Expected{" "}
                  {item.expectedValue.toString()} · Variance{" "}
                  {item.varianceValue.toString()}
                </p>
                {["DRAFT", "REVIEW_REQUIRED", "BALANCED"].includes(item.status) ? (
                  <form
                    action={approveInventoryFinancialReconciliationAction}
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="reconciliationId"
                      value={item.id}
                    />
                    <button className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">
                      Approve reconciliation
                    </button>
                  </form>
                ) : null}
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
