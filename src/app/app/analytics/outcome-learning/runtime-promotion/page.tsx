import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  generateRuntimePromotionAssessmentAction,
  promoteRuntimeAdoptionAction,
  rejectRuntimePromotionAction,
  rollbackRuntimeAdoptionAction,
} from "@/modules/closed-loop-procurement/runtime-promotion-actions";
import { getRuntimePromotionWorkspace } from "@/modules/closed-loop-procurement/runtime-promotion-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function RuntimePromotionPage() {
  const data =
    await getRuntimePromotionWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B12.9 · Runtime Promotion Governance
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed Runtime Promotion & Rollback
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Assess SHADOW evidence before ENFORCED promotion,
            require human approval, and continuously evaluate
            rollback conditions using divergence, fallback and
            denied-decision rates.
          </p>
        </div>

        <form
          action={
            generateRuntimePromotionAssessmentAction
          }
        >
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Generate readiness assessment
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Draft assessments"
          value={data.metrics.draft}
        />
        <Metric
          label="Eligible"
          value={data.metrics.eligible}
        />
        <Metric
          label="Promoted"
          value={data.metrics.promoted}
        />
        <Metric
          label="Rollback recommended"
          value={
            data.metrics.rollbackRecommended
              ? "Yes"
              : "No"
          }
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Promotion assessments
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.assessments.length === 0 ? (
            <p className="text-sm text-slate-600">
              No promotion assessments generated.
            </p>
          ) : (
            data.assessments.map((assessment) => {
              const blockers =
                Array.isArray(
                  assessment.blockers,
                )
                  ? assessment.blockers
                  : [];

              return (
                <article
                  key={assessment.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {assessment.decisionPath.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assessment.currentMode} →{" "}
                        {assessment.recommendedMode} ·{" "}
                        {assessment.status}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      readiness{" "}
                      {pct(
                        assessment.readinessScore,
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Cell
                      label="Decisions"
                      value={`${assessment.observedDecisionCount}/${assessment.minimumDecisionCount}`}
                    />
                    <Cell
                      label="Divergence"
                      value={pct(
                        assessment.observedDivergenceRate,
                      )}
                    />
                    <Cell
                      label="Fallback"
                      value={pct(
                        assessment.fallbackRate,
                      )}
                    />
                    <Cell
                      label="Clamped"
                      value={String(
                        assessment.clampedDecisionCount,
                      )}
                    />
                  </div>

                  {blockers.length > 0 ? (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-black">
                        Promotion blockers
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {blockers.map(
                          (blocker, index) => (
                            <li key={index}>
                              {String(blocker)}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}

                  {assessment.status ===
                  "DRAFT" ? (
                    <form
                      action={
                        assessment.eligible
                          ? promoteRuntimeAdoptionAction
                          : rejectRuntimePromotionAction
                      }
                      className="mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
                    >
                      <input
                        type="hidden"
                        name="assessmentId"
                        value={assessment.id}
                      />
                      <input
                        className={input}
                        name="note"
                        placeholder="Governance decision rationale"
                      />
                      <button
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white ${
                          assessment.eligible
                            ? "bg-emerald-700"
                            : "bg-rose-700"
                        }`}
                      >
                        {assessment.eligible ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Promote to ENFORCED
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            Reject assessment
                          </>
                        )}
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-amber-700" />
          <h2 className="text-xl font-black">
            Rollback readiness
          </h2>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Cell
            label="Divergence rate"
            value={pct(
              data.rollback.metrics
                .divergenceRate,
            )}
          />
          <Cell
            label="Fallback rate"
            value={pct(
              data.rollback.metrics
                .fallbackRate,
            )}
          />
          <Cell
            label="Denied rate"
            value={pct(
              data.rollback.metrics.deniedRate,
            )}
          />
        </div>

        {data.rollback.reasons.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-black">
              Rollback triggers detected
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.rollback.reasons.map(
                (reason) => (
                  <li key={reason}>
                    {reason}
                  </li>
                ),
              )}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No rollback trigger is currently detected.
          </p>
        )}

        {data.rollback.adoption.mode ===
        "ENFORCED" ? (
          <form
            action={
              rollbackRuntimeAdoptionAction
            }
            className="mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
          >
            <input
              className={input}
              name="note"
              placeholder="Rollback rationale"
            />
            <button className="rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black text-white">
              Roll back to SHADOW
            </button>
          </form>
        ) : null}
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B12.9 never promotes automatically. Eligibility is an
          evidence-based recommendation only; an authorized user
          must explicitly approve SHADOW → ENFORCED. Automatic
          rollback is also disabled by default.
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
      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </article>
  );
}

function Cell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  );
}
