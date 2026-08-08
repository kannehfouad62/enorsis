import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  decideExecutionEnvelopeAction,
  stagePlanActionForExecutionAction,
  stageRecommendationForExecutionAction,
} from "@/modules/autonomous-procurement/execution-actions";
import { getAutonomousExecutionWorkspace } from "@/modules/autonomous-procurement/execution-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function AutonomousExecutionPage() {
  const data = await getAutonomousExecutionWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B9.3 · Human-Governed Autonomous Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Controlled Execution & Policy Governance
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Stage approved procurement actions and accepted
          recommendations inside governed execution envelopes,
          evaluate policy boundaries, require explicit human release,
          and create controlled workflow handoffs without directly
          creating live procurement transactions.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Execution envelopes"
          value={data.metrics.totalEnvelopes}
        />
        <Metric
          label="Pending release"
          value={data.metrics.pendingRelease}
        />
        <Metric
          label="Released"
          value={data.metrics.released}
        />
        <Metric
          label="Blocked"
          value={data.metrics.blocked}
        />
        <Metric
          label="Ready handoffs"
          value={data.metrics.readyHandoffs}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black">
            Stage approved plan action
          </h2>
          <form
            action={stagePlanActionForExecutionAction}
            className="mt-5 space-y-3"
          >
            <select
              className={`${input} w-full`}
              name="planActionId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select approved plan action
              </option>
              {data.availablePlanActions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.actionType.replaceAll("_", " ")} ·{" "}
                  {action.resourceLabel}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Stage for policy review
            </button>
          </form>
        </div>

        <div className={card}>
          <h2 className="text-xl font-black">
            Stage accepted recommendation
          </h2>
          <form
            action={
              stageRecommendationForExecutionAction
            }
            className="mt-5 space-y-3"
          >
            <select
              className={`${input} w-full`}
              name="recommendationId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select accepted recommendation
              </option>
              {data.availableRecommendations.map(
                (recommendation) => (
                  <option
                    key={recommendation.id}
                    value={recommendation.id}
                  >
                    {recommendation.recommendationType.replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    · {recommendation.title}
                  </option>
                ),
              )}
            </select>
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Stage for policy review
            </button>
          </form>
        </div>
      </section>

      {data.latestEnvelope ? (
        <>
          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {data.latestEnvelope.status}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {data.latestEnvelope.sourceLabel}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {data.latestEnvelope.executionType.replaceAll(
                    "_",
                    " ",
                  )}{" "}
                  →{" "}
                  {data.latestEnvelope.targetWorkflow.replaceAll(
                    "_",
                    " ",
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-black">
                  {data.latestEnvelope.riskLevel} risk
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Human release required
                </p>
              </div>
            </div>
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Policy evaluation
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {data.checks.map((check) => (
                <article
                  key={check.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-black">
                      {check.policyLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {check.rationale}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">
                      {check.result}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {check.blocking
                        ? "Blocking"
                        : check.severity}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {data.latestEnvelope.status ===
          "PENDING_HUMAN_RELEASE" ? (
            <section className={`${card} mt-8`}>
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-black">
                  Human release decision
                </h2>
              </div>

              <form
                action={decideExecutionEnvelopeAction}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="envelopeId"
                  value={data.latestEnvelope.id}
                />
                <textarea
                  className={`${input} min-h-24 w-full`}
                  name="reason"
                  placeholder="Release rationale, controls, conditions or rejection reason"
                />

                <div className="mt-3 flex gap-3">
                  <button
                    name="decision"
                    value="RELEASE"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Release to controlled handoff
                  </button>

                  <button
                    name="decision"
                    value="REJECT"
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject execution
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </>
      ) : null}

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Controlled workflow handoffs
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {data.handoffs.map((handoff) => (
            <article
              key={handoff.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {handoff.targetWorkflow.replaceAll(
                    "_",
                    " ",
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {handoff.handoffMode} ·{" "}
                  {handoff.status}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {handoff.createdAt.toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B9.3 creates controlled handoff records only. A RELEASED
          execution envelope is authorized for downstream workflow
          integration, but this phase does not directly create
          requisitions, RFQs, purchase orders, supplier awards,
          contracts, inventory movements, or payments.
        </p>
      </div>
    </div>
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
