import {
  acknowledgePurchaseOrderExecutionAction,
  createPurchaseOrderExecutionAction,
  createPurchaseOrderRevisionAction,
  issuePurchaseOrderExecutionAction,
  validatePurchaseOrderExecutionAction,
} from "@/modules/requisition-to-order/purchase-order-actions";
import { getPurchaseOrderExecutionWorkspace } from "@/modules/requisition-to-order/purchase-order-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PurchaseOrderExecutionPage() {
  const data = await getPurchaseOrderExecutionWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B1.4
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Purchase Order Generation & Change Control
      </h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Generate purchase order</h2>
        <form action={createPurchaseOrderExecutionAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-sm font-bold">Approved journey</span>
            <select className={input} name="journeyId" required>
              <option value="">Select journey</option>
              {data.journeys.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.journeyNumber} — {journey.title}
                </option>
              ))}
            </select>
          </label>
          <Field name="supplierId" label="Supplier ID" required />
          <Field name="contractId" label="Contract ID" />
          <Field name="currencyCode" label="Currency" value="USD" required />
          <Field name="lineDescription" label="Line description" required />
          <Field name="quantity" label="Quantity" type="number" value="1" required />
          <Field name="unitPrice" label="Unit price" type="number" required />
          <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
          <Field name="taxAmount" label="Tax amount" type="number" value="0" />
          <Field name="freightAmount" label="Freight amount" type="number" value="0" />
          <Field name="discountAmount" label="Discount amount" type="number" value="0" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Generate purchase order
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Purchase orders</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.executions.map((execution) => (
            <article key={execution.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {execution.status} · REVISION {execution.currentRevision}
              </p>
              <h3 className="mt-2 text-lg font-black">{execution.orderNumber}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Supplier {execution.supplierId} · {execution.currencyCode} {execution.totalAmount.toString()}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <form action={validatePurchaseOrderExecutionAction}>
                  <input type="hidden" name="executionId" value={execution.id} />
                  <button className="rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-slate-200">Validate</button>
                </form>
                {execution.status === "READY_TO_ISSUE" ? (
                  <form action={issuePurchaseOrderExecutionAction}>
                    <input type="hidden" name="executionId" value={execution.id} />
                    <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Issue</button>
                  </form>
                ) : null}
                {execution.status === "ISSUED" ? (
                  <form action={acknowledgePurchaseOrderExecutionAction}>
                    <input type="hidden" name="executionId" value={execution.id} />
                    <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">Acknowledge</button>
                  </form>
                ) : null}
              </div>

              <form action={createPurchaseOrderRevisionAction} className="mt-5 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="executionId" value={execution.id} />
                <Field name="reason" label="Revision reason" required />
                <Field name="supplierId" label="Supplier ID" value={execution.supplierId} required />
                <Field name="currencyCode" label="Currency" value={execution.currencyCode} required />
                <Field name="lineDescription" label="Line description" required />
                <Field name="quantity" label="Quantity" type="number" value="1" required />
                <Field name="unitPrice" label="Unit price" type="number" required />
                <Field name="unitOfMeasure" label="Unit of measure" value="EA" />
                <button className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white">Create revision</button>
              </form>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">Validation evidence</p>
                <div className="mt-3 space-y-2">
                  {execution.validations.slice(0, 8).map((check) => (
                    <p key={check.id} className="text-xs text-slate-600">
                      {check.status} · {check.name}{check.remediation ? ` — ${check.remediation}` : ""}
                    </p>
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
      <input className={input} name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
