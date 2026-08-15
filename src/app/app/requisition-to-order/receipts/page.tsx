import {
  createGoodsReceiptSessionAction,
  postGoodsReceiptSessionAction,
  resolveGoodsReceiptExceptionAction,
} from "@/modules/requisition-to-order/goods-receipt-actions";
import { getGoodsReceiptWorkspace } from "@/modules/requisition-to-order/goods-receipt-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function GoodsReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
}) {
  const data = await getGoodsReceiptWorkspace();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B1.5
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Goods Receipt & Exception Management
      </h1>

      {params.created === "1" ? (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900"
        >
          Goods receipt draft created successfully.
        </div>
      ) : null}

      {params.error ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-900"
        >
          {params.error}
        </div>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Record receipt</h2>
        <form
          action={createGoodsReceiptSessionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Purchase order</span>
            <select className={input} name="purchaseOrderExecutionId" required>
              <option value="">Select purchase order</option>
              {data.orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </label>
          <Field name="deliveryReference" label="Delivery reference" />
          <Field name="carrierReference" label="Carrier reference" />
          <Field name="locationReference" label="Receiving location" />
          <Field name="lineReference" label="Line reference" required />
          <Field name="description" label="Description" required />
          <Field name="orderedQuantity" label="Ordered quantity" type="number" required />
          <Field name="previouslyReceived" label="Previously received" type="number" value="0" />
          <Field name="receivedQuantity" label="Received quantity" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <label>
            <span className="text-sm font-bold">Condition</span>
            <select className={input} name="condition">
              <option>ACCEPTED</option>
              <option>DAMAGED</option>
              <option>REJECTED</option>
              <option>QUARANTINED</option>
            </select>
          </label>
          <Field name="serialOrLotReference" label="Serial or lot reference" />
          <Field name="notes" label="Notes" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create draft receipt
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Receipt sessions</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{receipt.status}</p>
              <h3 className="mt-2 text-lg font-black">{receipt.receiptNumber}</h3>
              <p className="mt-2 text-sm text-slate-600">
                PO {receipt.purchaseOrderExecution.orderNumber}
              </p>

              {receipt.status === "DRAFT" ? (
                <form action={postGoodsReceiptSessionAction} className="mt-5 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="receiptSessionId" value={receipt.id} />
                  <Field name="overReceiptTolerancePercent" label="Over-receipt tolerance %" type="number" value="0" />
                  <Field name="underReceiptTolerancePercent" label="Under-receipt tolerance %" type="number" value="0" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Post receipt
                  </button>
                </form>
              ) : null}

              <div className="mt-5 space-y-3">
                {receipt.lines.map((line) => (
                  <div key={line.id} className="rounded-xl bg-white p-3 text-sm">
                    <p className="font-black">{line.lineReference} — {line.description}</p>
                    <p className="mt-1 text-slate-500">
                      Received {line.receivedQuantity.toString()} {line.unitOfMeasure} · {line.condition}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">Exceptions</p>
                <div className="mt-3 space-y-3">
                  {receipt.exceptions.map((exception) => (
                    <div key={exception.id} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-black">
                        {exception.severity} · {exception.exceptionType}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{exception.title}</p>
                      {exception.status !== "RESOLVED" ? (
                        <form action={resolveGoodsReceiptExceptionAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="exceptionId" value={exception.id} />
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
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
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
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  type?: string;
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
