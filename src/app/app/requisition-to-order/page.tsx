import {
  createJourneyAction,
  raiseJourneyExceptionAction,
  transitionJourneyAction,
} from "@/modules/requisition-to-order/actions";
import { getRequisitionToOrderWorkspace } from "@/modules/requisition-to-order/queries";
import { ApprovalPanel } from "./approval-panel";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const statuses = [
  "DRAFT",
  "REQUISITION_SUBMITTED",
  "APPROVAL_PENDING",
  "APPROVED",
  "ORDER_PENDING",
  "ORDER_ISSUED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "CANCELLED",
  "EXCEPTION",
] as const;

export default async function RequisitionToOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    approvalMessage?: string;
    approvalError?: string;
  }>;
}) {
  const data = await getRequisitionToOrderWorkspace();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Requisition-to-Order Command Center
      </h1>

      {params.approvalMessage ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">
          {params.approvalMessage}
        </div>
      ) : null}

      {params.approvalError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-900">
          {params.approvalError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/app/requisition-to-order/assurance"
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
        >
          Lifecycle assurance
        </a>
        <a
          href="/app/requisition-to-order/certification"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Process certification
        </a>
        <a
          href="/app/requisition-to-order/analytics"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          RTO analytics
        </a>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="All journeys" value={data.totals.all} />
        <Metric label="Awaiting approval" value={data.totals.awaitingApproval} />
        <Metric label="Awaiting order" value={data.totals.awaitingOrder} />
        <Metric label="Awaiting receipt" value={data.totals.awaitingReceipt} />
        <Metric label="Exceptions" value={data.totals.exceptions} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create journey</h2>
        <form
          action={createJourneyAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="title" label="Business need" required />
          <Field name="description" label="Description" />
          <Field name="currencyCode" label="Currency" value="USD" />
          <Field name="estimatedAmount" label="Estimated amount" type="number" />
          <Field name="requiredByDate" label="Required by" type="date" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create requisition journey
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Journeys</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.journeys.map((journey) => (
            <article key={journey.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{journey.status}</p>
              <h3 className="mt-2 text-lg font-black">
                {journey.journeyNumber} — {journey.title}
              </h3>
              <p className="mt-3 text-sm font-bold">
                {journey.currencyCode}{" "}
                {journey.estimatedAmount?.toString() ?? "0.00"}
              </p>

              <form action={transitionJourneyAction} className="mt-5 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="journeyId" value={journey.id} />
                <label>
                  <span className="text-sm font-bold">Status</span>
                  <select className={input} name="status" defaultValue={journey.status}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <Field name="description" label="Transition note" />
                <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  Update journey
                </button>
              </form>

              <form action={raiseJourneyExceptionAction} className="mt-5 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="journeyId" value={journey.id} />
                <Field name="code" label="Exception code" value="RTO-EXCEPTION" required />
                <Field name="exceptionTitle" label="Exception title" required />
                <Field name="exceptionDescription" label="Description" />
                <label>
                  <span className="text-sm font-bold">Severity</span>
                  <select className={input} name="severity">
                    <option>LOW</option>
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                  </select>
                </label>
                <button className="rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white">
                  Raise exception
                </button>
              </form>

              <ApprovalPanel
                currentUserId={data.currentUserId}
                approverProfiles={data.approverProfiles}
                journeyId={journey.id}
                journeyStatus={journey.status}
                currencyCode={journey.currencyCode}
                estimatedAmount={journey.estimatedAmount?.toString() ?? null}
                routes={journey.approvalRoutes}
              />

              

              
<div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Recent milestones
                </p>
                <div className="mt-3 space-y-2">
                  {journey.milestones.map((milestone) => (
                    <p key={milestone.id} className="text-xs text-slate-600">
                      {milestone.milestoneType} ·{" "}
                      {milestone.occurredAt.toLocaleString()}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={card}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
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
