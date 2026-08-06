import {
  assessPurchaseRequestAction,
  submitAssessedPurchaseRequestAction,
} from "@/modules/requisition-to-order/purchase-request-actions";
import { getPurchaseRequestIntegrationWorkspace } from "@/modules/requisition-to-order/purchase-request-queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PurchaseRequestIntegrationPage() {
  const data = await getPurchaseRequestIntegrationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Phase B1.2</p>
      <h1 className="mt-3 text-4xl font-black">Purchase Request Integration</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Link an existing tenant purchase request, run submission-readiness checks,
        retain evidence, and block incomplete requests before approval routing.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Assess purchase request</h2>
        <form action={assessPurchaseRequestAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-sm font-bold">Journey</span>
            <select className={input} name="journeyId" required>
              <option value="">Select journey</option>
              {data.journeys.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.journeyNumber} — {journey.title}
                </option>
              ))}
            </select>
          </label>
          <Field name="purchaseRequestId" label="Purchase request ID" required />
          <Field name="requestNumber" label="Request number" />
          <Field name="requestTitle" label="Request title" />
          <Field name="currencyCode" label="Currency" value="USD" required />
          <Field name="declaredLineCount" label="Line count" type="number" value="1" required />
          <Field name="declaredTotalAmount" label="Total amount" type="number" required />
          <Field name="businessJustification" label="Business justification" required />
          <Field name="budgetReference" label="Budget reference" />
          <Field name="costCenterReference" label="Cost-center reference" />
          <Field name="requiredByDate" label="Required by" type="date" />
          <Field name="supplierId" label="Supplier ID" />
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input type="checkbox" name="supplierRequired" />
            <span className="text-sm font-bold">Supplier required</span>
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Run readiness assessment
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Assessment history</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.assessments.map((assessment) => (
            <article key={assessment.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{assessment.status}</p>
              <h3 className="mt-2 text-lg font-black">
                {assessment.requestNumber ?? assessment.purchaseRequestId}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {assessment.journey.journeyNumber} · {assessment.currencyCode} {assessment.declaredTotalAmount?.toString() ?? "0.00"}
              </p>
              <div className="mt-4 space-y-2">
                {assessment.checks.map((check) => (
                  <p key={check.id} className="text-xs text-slate-600">
                    {check.status} · {check.name}{check.remediation ? ` — ${check.remediation}` : ""}
                  </p>
                ))}
              </div>
              {assessment.status === "READY" ? (
                <form action={submitAssessedPurchaseRequestAction} className="mt-4">
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Submit purchase request
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
