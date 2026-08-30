import {
  approveThreeWayMatchForPaymentAction,
  createThreeWayMatchCaseAction,
  resolveThreeWayMatchExceptionAction,
} from "@/modules/requisition-to-order/three-way-match-actions";
import { getThreeWayMatchWorkspace } from "@/modules/requisition-to-order/three-way-match-queries";
import { LocalizedText } from "@/components/LocalizedText";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ThreeWayMatchPage() {
  const data = await getThreeWayMatchWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black"><LocalizedText namespace="threeWayMatchPage" messageKey="threeWayMatch" /></h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Reconcile purchase orders, accepted receipts, and supplier invoices
        before payment approval.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black"><LocalizedText namespace="threeWayMatchPage" messageKey="createMatchCase" /></h2>
        <form
          action={createThreeWayMatchCaseAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold"><LocalizedText namespace="threeWayMatchPage" messageKey="purchaseOrder" /></span>
            <select className={input} name="purchaseOrderExecutionId" required>
              <option value=""><LocalizedText namespace="threeWayMatchPage" messageKey="selectPurchaseOrder" /></option>
              {data.orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold"><LocalizedText namespace="threeWayMatchPage" messageKey="goodsReceipt" /></span>
            <select className={input} name="goodsReceiptSessionId" required>
              <option value=""><LocalizedText namespace="threeWayMatchPage" messageKey="selectReceipt" /></option>
              {data.receipts.map((receipt) => (
                <option key={receipt.id} value={receipt.id}>
                  {receipt.receiptNumber} —{" "}
                  {receipt.purchaseOrderExecution.orderNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold"><LocalizedText namespace="threeWayMatchPage" messageKey="supplierInvoice" /></span>
            <select className={input} name="supplierInvoiceId" required>
              <option value=""><LocalizedText namespace="threeWayMatchPage" messageKey="selectSupplierInvoice" /></option>
              {data.supplierInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} — {invoice.supplier.legalName} —{" "}
                  {invoice.currencyCode} {invoice.totalAmount.toString()}
                </option>
              ))}
            </select>
          </label>
          <Field name="lineReference" label="Line reference" required />
          <Field name="lineDescription" label="Line description" required />
          <Field name="invoicedQuantity" label="Invoiced quantity" type="number" required />
          <Field name="invoiceUnitPrice" label="Invoice unit price" type="number" required />
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Invoice number and total amount are derived from the selected supplier invoice.
          </div>
          <Field name="quantityTolerancePercent" label="Quantity tolerance %" type="number" value="0" />
          <Field name="amountTolerancePercent" label="Amount tolerance %" type="number" value="0" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Run three-way match
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black"><LocalizedText namespace="threeWayMatchPage" messageKey="matchCases" /></h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.matchCases.map((matchCase) => (
            <article key={matchCase.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{matchCase.status}</p>
              <h3 className="mt-2 text-lg font-black">{matchCase.matchNumber}</h3>
              <p className="mt-2 text-sm text-slate-600">
                PO {matchCase.purchaseOrderExecution.orderNumber} · Receipt{" "}
                {matchCase.goodsReceiptSession.receiptNumber} · Invoice{" "}
                {matchCase.invoiceNumber ?? matchCase.supplierInvoiceId}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="PO amount" value={matchCase.poAmount.toString()} />
                <Metric label="Receipt amount" value={matchCase.receiptAmount.toString()} />
                <Metric label="Invoice amount" value={matchCase.invoiceAmount.toString()} />
                <Metric label="Variance" value={matchCase.amountVariance.toString()} />
              </div>

              <div className="mt-5 space-y-3">
                {matchCase.lines.map((line) => (
                  <div key={line.id} className="rounded-xl bg-white p-3 text-sm">
                    <p className="font-black">
                      {line.status} · {line.lineReference}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Qty variance {line.quantityVariance.toString()} · Price variance{" "}
                      {line.priceVariance.toString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Exceptions
                </p>
                <div className="mt-3 space-y-3">
                  {matchCase.exceptions.map((exception) => (
                    <div key={exception.id} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-black">
                        {exception.severity} · {exception.exceptionType}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {exception.title}
                      </p>
                      {["OPEN", "INVESTIGATING"].includes(exception.status) ? (
                        <form
                          action={resolveThreeWayMatchExceptionAction}
                          className="mt-3 grid gap-2"
                        >
                          <input type="hidden" name="exceptionId" value={exception.id} />
                          <input
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            name="resolution"
                            placeholder="Resolution"
                            required
                          />
                          <label className="flex items-center gap-2 text-xs font-bold">
                            <input type="checkbox" name="waive" />
                            Waive within delegated authority
                          </label>
                          <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                            Resolve exception
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {["MATCHED", "MATCHED_WITH_WARNINGS"].includes(matchCase.status) ? (
                <form action={approveThreeWayMatchForPaymentAction} className="mt-5">
                  <input type="hidden" name="matchCaseId" value={matchCase.id} />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Approve for payment
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
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
