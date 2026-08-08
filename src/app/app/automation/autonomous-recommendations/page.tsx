import {
  AlertTriangle,
  CircleDollarSign,
  Lightbulb,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  decideAutonomousRecommendationAction,
  generateAutonomousRecommendationsAction,
} from "@/modules/autonomous-procurement/recommendation-actions";
import { getAutonomousRecommendationWorkspace } from "@/modules/autonomous-procurement/recommendation-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function AutonomousRecommendationsPage() {
  const data =
    await getAutonomousRecommendationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B9.2 · Human-Governed Autonomous Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Strategy, Savings & Risk Recommendations
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Generate governed strategy recommendations, savings
          hypotheses and risk-mitigation actions from approved
          procurement plans and predictive evidence. Every
          recommendation requires human disposition and never
          executes automatically.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Recommendation sets"
          value={data.metrics.sets}
        />
        <Metric
          label="Awaiting review"
          value={data.metrics.proposed}
        />
        <Metric
          label="Accepted"
          value={data.metrics.accepted}
        />
        <Metric
          label="Savings hypothesis"
          value={`$${data.metrics.estimatedSavingsUsd.toLocaleString(
            undefined,
            { maximumFractionDigits: 0 },
          )}`}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Generate recommendation set
          </h2>
        </div>

        <form
          action={
            generateAutonomousRecommendationsAction
          }
          className="mt-5 grid gap-3 md:grid-cols-3"
        >
          <input
            className={input}
            name="title"
            placeholder="Q4 strategy & savings recommendations"
          />

          <select
            className={input}
            name="sourcePlanId"
            defaultValue=""
          >
            <option value="">
              Latest approved procurement plan
            </option>
            {data.approvedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>

          <select
            className={input}
            name="horizonDays"
            defaultValue="90"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
          </select>

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white md:col-span-3">
            Generate recommendations
          </button>
        </form>
      </section>

      {data.latestSet ? (
        <>
          <section className={`${card} mt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {data.latestSet.status} ·{" "}
                  {data.latestSet.modelVersion}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {data.latestSet.title}
                </h2>
              </div>

              <div className="text-right">
                <p className="font-black">
                  {data.latestSet.overallRiskLevel} risk
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  ${Number(
                    data.latestSet.estimatedExposureUsd,
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  modeled exposure
                </p>
              </div>
            </div>
          </section>

          <section className={`${card} mt-8`}>
            <h2 className="text-xl font-black">
              Governed recommendations
            </h2>

            <div className="mt-5 space-y-4">
              {data.recommendations.map(
                (recommendation) => (
                  <article
                    key={recommendation.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-3xl">
                        <div className="flex items-center gap-2">
                          <RecommendationIcon
                            type={
                              recommendation.recommendationType
                            }
                          />
                          <p className="text-xs font-black uppercase text-blue-700">
                            {recommendation.recommendationType.replaceAll(
                              "_",
                              " ",
                            )}
                          </p>
                        </div>
                        <h3 className="mt-2 text-lg font-black">
                          {recommendation.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {recommendation.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            Priority:{" "}
                            {recommendation.priority}
                          </span>
                          <span>
                            Risk:{" "}
                            {recommendation.riskLevel}
                          </span>
                          <span>
                            Confidence:{" "}
                            {Number(
                              recommendation.confidence,
                            ).toFixed(0)}
                            %
                          </span>
                          {recommendation.estimatedSavingsUsd !==
                          null ? (
                            <span>
                              Savings hypothesis: $
                              {Number(
                                recommendation.estimatedSavingsUsd,
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black">
                        {recommendation.status}
                      </span>
                    </div>

                    {recommendation.status ===
                    "PROPOSED" ? (
                      <form
                        action={
                          decideAutonomousRecommendationAction
                        }
                        className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
                      >
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <input
                          className={input}
                          name="reason"
                          placeholder="Review rationale / conditions"
                        />
                        <button
                          name="decision"
                          value="ACCEPT"
                          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"
                        >
                          Accept
                        </button>
                        <button
                          name="decision"
                          value="DEFER"
                          className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white"
                        >
                          Defer
                        </button>
                        <button
                          name="decision"
                          value="REJECT"
                          className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-black text-white"
                        >
                          Reject
                        </button>
                      </form>
                    ) : null}
                  </article>
                ),
              )}
            </div>
          </section>

          <section className={`${card} mt-8`}>
            <h2 className="text-xl font-black">
              Governed AI recommendation review
            </h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-5">
              {data.latestSet.aiNarrative ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {data.latestSet.aiNarrative}
                </p>
              ) : data.latestSet.aiError ? (
                <p className="text-sm text-rose-700">
                  Deterministic recommendations were
                  generated, but optional AI review was
                  unavailable: {data.latestSet.aiError}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  No governed AI recommendation review is
                  available.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Recommendation history
        </h2>
        <div className="mt-4 space-y-3">
          {data.sets.map((set) => (
            <article
              key={set.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{set.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {set.horizonDays} days ·{" "}
                  {set.overallRiskLevel} risk ·{" "}
                  {set.status}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {set.createdAt.toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Savings values in B9.2 are planning hypotheses, not
          realized savings. Accepting a recommendation records a
          human disposition only and does not create sourcing
          events, purchase requests, purchase orders, supplier
          awards, contracts, inventory transactions, or payments.
        </p>
      </div>
    </div>
  );
}

function RecommendationIcon({
  type,
}: {
  type: string;
}) {
  return type === "SAVINGS_OPPORTUNITY" ? (
    <CircleDollarSign className="h-4 w-4 text-emerald-700" />
  ) : type === "RISK_MITIGATION" ? (
    <ShieldAlert className="h-4 w-4 text-rose-700" />
  ) : (
    <Lightbulb className="h-4 w-4 text-blue-700" />
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
