import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  discoverClosedLoopOutcomesAction,
  observeClosedLoopMetricAction,
  validateClosedLoopOutcomeAction,
} from "@/modules/closed-loop-procurement/outcome-actions";
import { getClosedLoopOutcomeWorkspace } from "@/modules/closed-loop-procurement/outcome-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function OutcomeLearningPage() {
  const data = await getClosedLoopOutcomeWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B12.1 · Closed-Loop Procurement Intelligence
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Outcome Capture & Learning Foundation
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Compare autonomous procurement predictions with
            observed operational outcomes, preserve evidence,
            calculate variance and validate outcome quality before
            any result is eligible for downstream learning.
          </p>
        </div>

        <form action={discoverClosedLoopOutcomesAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Discover completed outcomes
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Outcome cases"
          value={data.metrics.totalOutcomes}
        />
        <Metric label="Open" value={data.metrics.open} />
        <Metric
          label="Observed"
          value={data.metrics.observed}
        />
        <Metric
          label="Validated"
          value={data.metrics.validated}
        />
        <Metric
          label="Observed metrics"
          value={data.metrics.observedMetrics}
        />
        <Metric
          label="Mean abs variance"
          value={pct(
            data.metrics.meanAbsoluteVariance,
          )}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Closed-loop outcome cases
          </h2>
        </div>

        <div className="mt-5 space-y-5">
          {data.outcomes.length === 0 ? (
            <p className="text-sm text-slate-600">
              No completed autonomous execution outcomes have been
              discovered yet.
            </p>
          ) : (
            data.outcomes.map((outcome) => {
              const metrics =
                data.byOutcome.get(outcome.id) ?? [];

              return (
                <article
                  key={outcome.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {outcome.targetWorkflow.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {outcome.status} ·{" "}
                        {outcome.outcomeQuality}
                      </p>
                    </div>

                    {outcome.nativeReferenceUrl ? (
                      <Link
                        href={
                          outcome.nativeReferenceUrl
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
                      >
                        Native record
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.id}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-black">
                              {metric.metricLabel}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Predicted:{" "}
                              {metric.predictedValue ??
                                "—"}{" "}
                              {metric.unit ?? ""}
                              {" · "}Actual:{" "}
                              {metric.actualValue ??
                                "—"}{" "}
                              {metric.unit ?? ""}
                              {metric.variancePercent !==
                              null
                                ? ` · variance ${pct(
                                    metric.variancePercent,
                                  )}`
                                : ""}
                            </p>
                          </div>
                          <span className="text-xs font-black text-blue-700">
                            {metric.status}
                          </span>
                        </div>

                        {metric.status ===
                        "PREDICTED" ? (
                          <form
                            action={
                              observeClosedLoopMetricAction
                            }
                            className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]"
                          >
                            <input
                              type="hidden"
                              name="metricId"
                              value={metric.id}
                            />
                            <input
                              className={input}
                              type="number"
                              step="any"
                              name="actualValue"
                              required
                              placeholder="Actual value"
                            />
                            <input
                              className={input}
                              name="evidenceNote"
                              placeholder="Observation evidence / note"
                            />
                            <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">
                              Record actual
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {outcome.status !==
                    "VALIDATED" &&
                  outcome.status !==
                    "REJECTED" ? (
                    <form
                      action={
                        validateClosedLoopOutcomeAction
                      }
                      className="mt-5 grid gap-2 md:grid-cols-[180px_1fr_auto]"
                    >
                      <input
                        type="hidden"
                        name="outcomeId"
                        value={outcome.id}
                      />
                      <select
                        className={input}
                        name="quality"
                        required
                        defaultValue="VALIDATED"
                      >
                        <option value="VALIDATED">
                          Validated
                        </option>
                        <option value="PARTIAL">
                          Partial
                        </option>
                        <option value="REJECTED">
                          Reject outcome
                        </option>
                      </select>
                      <input
                        className={input}
                        name="note"
                        placeholder="Validation rationale"
                      />
                      <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Validate
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B12.1 does not retrain models or automatically change AI
          behavior. It creates a governed outcome dataset first.
          Only validated observations should be eligible for later
          calibration or learning.
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
