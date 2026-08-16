import {
  approveReplenishmentRecommendationAction,
  approveStockTransferAction,
  generateReplenishmentRecommendationsAction,
  receiveStockTransferAction,
  shipStockTransferAction,
  upsertReplenishmentPolicyAction,
} from "@/modules/replenishment/actions";
import { getReplenishmentWorkspace } from "@/modules/replenishment/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ReplenishmentPage() {
  const data = await getReplenishmentWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Replenishment, Min/Max Planning & Stock Transfer Orchestration
      </h1>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-black">Replenishment policies</h2>
          <form action={generateReplenishmentRecommendationsAction}>
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
              Generate recommendations
            </button>
          </form>
        </div>

        <form
          action={upsertReplenishmentPolicyAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="inventoryItemId" label="Inventory item ID" required />
          <Field name="locationId" label="Destination location ID" required />
          <Field name="sourceLocationId" label="Source location ID" />
          <Field name="minimumQuantity" label="Minimum quantity" type="number" required />
          <Field name="maximumQuantity" label="Maximum quantity" type="number" required />
          <Field name="reorderQuantity" label="Fixed reorder quantity" type="number" />
          <Field name="safetyStockQuantity" label="Safety stock" type="number" value="0" />
          <Field name="leadTimeDays" label="Lead time days" type="number" value="0" />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
            Save policy
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recommendations</h2>
        <div className="mt-5 space-y-4">
          {data.recommendations.map((item) => (
            <article key={item.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{item.status}</p>
              <h3 className="mt-2 text-lg font-black">
                {item.recommendationNumber}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {item.inventoryItemId} · {item.currentQuantity.toString()} current ·{" "}
                {item.recommendedQuantity.toString()} recommended
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.sourceLocationId ?? "No source"} →{" "}
                {item.destinationLocationId}
              </p>

              {item.status === "OPEN" ? (
                <form
                  action={approveReplenishmentRecommendationAction}
                  className="mt-4"
                >
                  <input
                    type="hidden"
                    name="recommendationId"
                    value={item.id}
                  />
                  <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">
                    Approve & create transfer
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Stock transfers</h2>
        <div className="mt-5 space-y-4">
          {data.transfers.map((transfer) => (
            <article key={transfer.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{transfer.status}</p>
              <h3 className="mt-2 text-lg font-black">
                {transfer.transferNumber}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {transfer.inventoryItemId} · {transfer.requestedQuantity.toString()}{" "}
                {transfer.unitOfMeasure}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {transfer.sourceLocationId} → {transfer.destinationLocationId}
              </p>

              {transfer.status === "DRAFT" ? (
                <form action={approveStockTransferAction} className="mt-4">
                  <input type="hidden" name="transferId" value={transfer.id} />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Approve transfer
                  </button>
                </form>
              ) : null}

              {transfer.status === "APPROVED" ? (
                <form action={shipStockTransferAction} className="mt-4">
                  <input type="hidden" name="transferId" value={transfer.id} />
                  <button className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white">
                    Ship transfer
                  </button>
                </form>
              ) : null}

              {transfer.status === "IN_TRANSIT" ? (
                <form
                  action={receiveStockTransferAction}
                  className="mt-4 flex gap-2"
                >
                  <input type="hidden" name="transferId" value={transfer.id} />
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="receivedQuantity"
                    type="number"
                    placeholder="Received quantity"
                    required
                  />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Receive transfer
                  </button>
                </form>
              ) : null}

              {transfer.exceptions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {transfer.exceptions.map((exception) => (
                    <div key={exception.id} className="rounded-xl bg-white p-3 text-xs">
                      <span className="font-black">
                        {exception.status} · {exception.exceptionType}
                      </span>
                      {exception.description ? ` — ${exception.description}` : ""}
                    </div>
                  ))}
                </div>
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
