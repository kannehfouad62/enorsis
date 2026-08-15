import Link from "next/link";

import {
  approvePaymentReadinessAction,
  assessPaymentReadinessAction,
  assignPaymentBatchAction,
  releasePaymentHoldAction,
} from "@/modules/requisition-to-order/payment-readiness-actions";
import { getPaymentReadinessWorkspace } from "@/modules/requisition-to-order/payment-readiness-queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PaymentReadinessPage() {
  const data = await getPaymentReadinessWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Phase B1.7</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="mt-3 text-4xl font-black">Accounts Payable & Payment Readiness</h1>
        <Link href="/app/requisition-to-order/banking-verification" className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">Supplier banking verification</Link>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Assess invoice readiness</h2>
        <form action={assessPaymentReadinessAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-sm font-bold">Approved match case</span>
            <select className={input} name="threeWayMatchCaseId" required>
              <option value="">Select match case</option>
              {data.matchCases.map((matchCase) => (
                <option key={matchCase.id} value={matchCase.id}>
                  {matchCase.matchNumber} — {matchCase.invoiceNumber ?? matchCase.supplierInvoiceId}
                </option>
              ))}
            </select>
          </label>
          <Field name="supplierInvoiceId" label="Supplier invoice ID" required />
          <Field name="invoiceNumber" label="Invoice number" />
          <Field name="supplierId" label="Supplier ID" />
          <Field name="dueDate" label="Due date" type="date" />
          <Field name="discountDate" label="Discount date" type="date" />
          <Field name="discountAmount" label="Discount amount" type="number" />
          <Check name="bankDetailsVerified" label="Bank details verified" />
          <Check name="supplierCompliant" label="Supplier compliant" />
          <Check name="taxValidated" label="Tax validated" />
          <Check name="duplicateInvoiceDetected" label="Duplicate detected" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Assess readiness</button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Readiness cases</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.readinessCases.map((readinessCase) => (
            <article key={readinessCase.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{readinessCase.status}</p>
              <h3 className="mt-2 text-lg font-black">{readinessCase.readinessNumber}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Invoice {readinessCase.invoiceNumber ?? readinessCase.supplierInvoiceId} · {readinessCase.currencyCode} {readinessCase.invoiceAmount.toString()}
              </p>

              <div className="mt-5 space-y-2">
                {readinessCase.checks.map((check) => (
                  <p key={check.id} className="text-xs text-slate-600">
                    {check.status} · {check.name}{check.remediation ? ` — ${check.remediation}` : ""}
                  </p>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">Payment holds</p>
                <div className="mt-3 space-y-3">
                  {readinessCase.holds.map((hold) => (
                    <div key={hold.id} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-black">{hold.status} · {hold.holdType}</p>
                      <p className="mt-1 text-xs text-slate-600">{hold.title}</p>
                      {hold.status === "ACTIVE" ? (
                        <form action={releasePaymentHoldAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="holdId" value={hold.id} />
                          <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" name="releaseReason" placeholder="Release reason" required />
                          <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">Release</button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {readinessCase.status === "READY" ? (
                <form action={approvePaymentReadinessAction} className="mt-5">
                  <input type="hidden" name="readinessCaseId" value={readinessCase.id} />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Approve readiness</button>
                </form>
              ) : null}

              {readinessCase.status === "APPROVED" ? (
                <form action={assignPaymentBatchAction} className="mt-5 flex gap-2">
                  <input type="hidden" name="readinessCaseId" value={readinessCase.id} />
                  <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" name="paymentBatchId" placeholder="Existing payment batch ID" required />
                  <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white">Assign batch</button>
                </form>
              ) : null}
            </article>
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
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input className={input} name={name} type={type} required={required} />
    </label>
  );
}
