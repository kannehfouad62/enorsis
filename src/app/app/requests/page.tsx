import {
  BadgeDollarSign,
  ClipboardCheck,
  FilePlus2,
  ShieldCheck,
} from "lucide-react";
import {
  createPurchaseRequestAction,
  decidePurchaseRequestAction,
} from "@/modules/purchase-requests/actions";
import { getPurchaseRequestWorkspace } from "@/modules/purchase-requests/queries";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PurchaseRequestsPage() {
  const { session, tenant, requests } = await getPurchaseRequestWorkspace();
  const canCreate = session.user.roles.some((role) =>
    ["REQUESTER", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Procure-to-pay
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Purchase requests
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Capture business demand, preserve currency context and route commitments
        through governed approval authority.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Metric icon={ClipboardCheck} label="Requests" value={String(requests.length)} />
        <Metric icon={BadgeDollarSign} label="Awaiting decision" value={String(requests.filter((item) => ["SUBMITTED", "UNDER_REVIEW"].includes(item.status)).length)} />
        <Metric icon={ShieldCheck} label="Approved" value={String(requests.filter((item) => item.status === "APPROVED").length)} />
      </div>

      {canCreate ? (
        <section className={`${cardClass} mt-6`}>
          <div className="flex items-center gap-3">
            <FilePlus2 className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">Create and submit request</h2>
          </div>
          <form action={createPurchaseRequestAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Request title"><input className={inputClass} name="title" required /></Field>
            <Field label="Priority">
              <select className={inputClass} name="priority" defaultValue="NORMAL">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </Field>
            <Field label="Needed by"><input className={inputClass} name="neededByDate" type="date" /></Field>
            <Field label="Currency"><input className={inputClass} name="originalCurrency" defaultValue={tenant.baseCurrencyCode} maxLength={3} required /></Field>
            <Field label="Rate to USD"><input className={inputClass} name="exchangeRateToUsd" type="number" step="0.000001" defaultValue="1" required /></Field>
            <Field label="Rate source"><input className={inputClass} name="exchangeRateSource" defaultValue="Manual approved rate" required /></Field>
            <ScopeSelect label="Legal entity" name="legalEntityId" options={tenant.legalEntities} />
            <ScopeSelect label="Site" name="siteId" options={tenant.sites} />
            <ScopeSelect label="Department" name="departmentId" options={tenant.departments} />
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-4">
              Business justification
              <textarea className={`${inputClass} min-h-28`} name="businessJustification" required />
            </label>

            <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black">Line item</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <Field label="Description"><input className={inputClass} name="lineDescription" required /></Field>
                <Field label="Category"><input className={inputClass} name="lineCategory" /></Field>
                <Field label="Quantity"><input className={inputClass} name="lineQuantity" type="number" step="0.0001" defaultValue="1" required /></Field>
                <Field label="Unit"><input className={inputClass} name="lineUnitOfMeasure" defaultValue="EA" required /></Field>
                <Field label="Unit price"><input className={inputClass} name="lineUnitPrice" type="number" step="0.0001" required /></Field>
                <Field label="Suggested supplier"><input className={inputClass} name="lineSupplierSuggestion" /></Field>
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700" type="submit">
                Submit purchase request
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="mt-6 space-y-5">
        {requests.map((request) => {
          const pendingForUser = request.approvals.some(
            (approval) =>
              approval.approverId === session.user.id &&
              approval.decision === "PENDING",
          );

          return (
            <article key={request.id} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">{request.requestNumber}</p>
                  <h2 className="mt-2 text-xl font-black">{request.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">Requested by {request.requester.name ?? request.requester.email}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{request.status.replaceAll("_", " ")}</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-4">
                <Summary label="Priority" value={request.priority} />
                <Summary label="Original total" value={`${request.originalCurrency} ${request.totalAmount.toString()}`} />
                <Summary label="USD equivalent" value={`USD ${request.usdEquivalent.toString()}`} />
                <Summary label="Lines" value={String(request.lines.length)} />
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">{request.businessJustification}</p>

              {pendingForUser ? (
                <form action={decidePurchaseRequestAction} className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <input type="hidden" name="purchaseRequestId" value={request.id} />
                  <textarea className={`${inputClass} min-h-20`} name="comments" placeholder="Decision comments" />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="APPROVED">Approve</button>
                    <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white" name="decision" value="RETURNED">Return</button>
                    <button className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="REJECTED">Reject</button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardCheck; label: string; value: string }) {
  return <article className={cardClass}><Icon className="h-5 w-5 text-blue-700" /><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></article>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-700">{label}{children}</label>;
}

function ScopeSelect({ label, name, options }: { label: string; name: string; options: Array<{ id: string; name: string }> }) {
  return (
    <Field label={label}>
      <select className={inputClass} name={name} defaultValue="">
        <option value="">Organization level</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </Field>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 font-black">{value}</p></div>;
}
