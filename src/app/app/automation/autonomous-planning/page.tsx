import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  decideAutonomousProcurementPlanAction,
  generateAutonomousProcurementPlanAction,
} from "@/modules/autonomous-procurement/actions";
import { getAutonomousProcurementPlanningWorkspace } from "@/modules/autonomous-procurement/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function AutonomousPlanningPage() {
  const data =
    await getAutonomousProcurementPlanningWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B9.1 · Human-Governed Autonomous Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Autonomous Procurement Planning
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Generate evidence-backed procurement plans from predictive
          procurement, inventory optimization, capacity planning,
          digital-twin risk and supplier-matching evidence. Every
          plan requires explicit human approval and approval does not
          execute transactions.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Plans"
          value={data.metrics.totalPlans}
        />
        <Metric
          label="Pending approval"
          value={data.metrics.pendingApproval}
        />
        <Metric
          label="Approved"
          value={data.metrics.approved}
        />
        <Metric
          label="Critical actions"
          value={data.metrics.criticalActions}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Generate governed procurement plan
          </h2>
        </div>

        <form
          action={
            generateAutonomousProcurementPlanAction
          }
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-72 flex-1 text-xs font-black uppercase text-slate-500">
            Plan title
            <input
              className={`${input} mt-2 block w-full`}
              name="title"
              placeholder="Q4 governed procurement plan"
            />
          </label>

          <label className="text-xs font-black uppercase text-slate-500">
            Planning horizon
            <select
              className={`${input} mt-2 block`}
              name="horizonDays"
              defaultValue="90"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </label>

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Generate plan
          </button>
        </form>
      </section>

      {data.latestPlan ? (
        <>
          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {data.latestPlan.status} ·{" "}
                  {data.latestPlan.modelVersion}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {data.latestPlan.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {data.latestPlan.horizonDays}-day horizon ·{" "}
                  {data.actions.length} proposed actions ·{" "}
                  {data.latestPlan.overallRiskLevel} risk
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
                Human approval required
              </div>
            </div>

            {data.latestPlan.status ===
            "PENDING_APPROVAL" ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <form
                  action={
                    decideAutonomousProcurementPlanAction
                  }
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <input
                    type="hidden"
                    name="planId"
                    value={data.latestPlan.id}
                  />
                  <textarea
                    className={`${input} min-h-20 w-full`}
                    name="reason"
                    placeholder="Approval rationale / conditions"
                  />
                  <button
                    name="decision"
                    value="APPROVE"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve plan
                  </button>
                </form>

                <form
                  action={
                    decideAutonomousProcurementPlanAction
                  }
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
                >
                  <input
                    type="hidden"
                    name="planId"
                    value={data.latestPlan.id}
                  />
                  <textarea
                    className={`${input} min-h-20 w-full`}
                    name="reason"
                    placeholder="Rejection rationale"
                    required
                  />
                  <button
                    name="decision"
                    value="REJECT"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject plan
                  </button>
                </form>
              </div>
            ) : null}
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Proposed plan actions
              </h2>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Value USD</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.actions.map((action) => (
                    <tr key={action.id}>
                      <td className="px-4 py-3 font-black">
                        {action.sequence}
                      </td>
                      <td className="px-4 py-3">
                        {action.actionType.replaceAll(
                          "_",
                          " ",
                        )}
                      </td>
                      <td className="px-4 py-3 font-black">
                        {action.resourceLabel}
                      </td>
                      <td className="px-4 py-3 font-black">
                        {action.priority}
                      </td>
                      <NumberCell
                        value={action.proposedQuantity}
                      />
                      <MoneyCell
                        value={action.proposedValueUsd}
                      />
                      <td className="px-4 py-3">
                        {Number(action.confidence).toFixed(
                          0,
                        )}
                        %
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {action.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Governed AI planning review
              </h2>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-5">
              {data.latestPlan.aiNarrative ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {data.latestPlan.aiNarrative}
                </p>
              ) : data.latestPlan.aiError ? (
                <p className="text-sm text-rose-700">
                  The deterministic plan was generated,
                  but the optional AI review was unavailable:{" "}
                  {data.latestPlan.aiError}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  No governed AI planning review is available.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Procurement plan history
        </h2>
        <div className="mt-4 space-y-3">
          {data.plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{plan.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {plan.horizonDays} days ·{" "}
                  {plan.overallRiskLevel} risk ·{" "}
                  {plan.status}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {plan.createdAt.toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B9.1 is recommendation-only. Approving a procurement plan
          records a governed human decision but does not create RFQs,
          purchase requests, purchase orders, supplier awards,
          contracts, replenishment transactions or payments.
        </p>
      </div>
    </div>
  );
}

function NumberCell({ value }: { value: unknown }) {
  return (
    <td className="px-4 py-3">
      {value === null || value === undefined
        ? "—"
        : Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
    </td>
  );
}

function MoneyCell({ value }: { value: unknown }) {
  return (
    <td className="px-4 py-3">
      {value === null || value === undefined
        ? "—"
        : `$${Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`}
    </td>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}
