import {
  BrainCircuit,
  Gauge,
  LineChart,
  Target,
} from "lucide-react";
import { getPredictionCalibrationWorkspace } from "@/modules/closed-loop-procurement/calibration-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function num(value: number) {
  return value.toFixed(2);
}

export default async function PredictionCalibrationPage() {
  const data =
    await getPredictionCalibrationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B12.3 · Closed-Loop Procurement Intelligence
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Prediction Accuracy, Calibration & Recommendation Effectiveness
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Measure how well validated autonomous procurement
          predictions align with observed native outcomes. This
          workspace tracks error distributions, recommendation
          effectiveness, workflow-level performance and confidence
          calibration without changing any model or execution policy.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Validated outcomes"
          value={data.metrics.validatedOutcomes}
        />
        <Metric
          label="Validated metrics"
          value={data.metrics.validatedMetrics}
        />
        <Metric
          label="MAPE"
          value={pct(
            data.metrics.meanAbsolutePercentageError,
          )}
        />
        <Metric
          label="P95 error"
          value={pct(
            data.metrics.p95AbsolutePercentageError,
          )}
        />
        <Metric
          label="Recommendation effectiveness"
          value={pct(
            data.metrics.recommendationEffectiveness,
          )}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Workflow performance
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.workflowPerformance.map((item) => (
              <div
                key={item.workflow}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black">
                    {item.workflow.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm font-black text-blue-700">
                    {pct(
                      item.recommendationEffectiveness,
                    )}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.outcomes} outcomes ·{" "}
                  {item.metrics} validated metrics · MAPE{" "}
                  {pct(
                    item.meanAbsolutePercentageError,
                  )}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Confidence calibration
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.calibration.map((item) => (
              <div
                key={item.bucket}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black">
                    Confidence {item.bucket}
                  </p>
                  <p className="text-sm font-black text-blue-700">
                    {item.count} samples
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Avg confidence{" "}
                  {pct(item.averageConfidence)} · observed accuracy{" "}
                  {pct(item.observedAccuracy)} · gap{" "}
                  {pct(item.calibrationGap)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Metric-level accuracy
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.metricPerformance.map((item) => (
            <article
              key={item.metricKey}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <p className="font-black">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.count} observations · unit{" "}
                {item.unit ?? "—"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">
                    MAPE
                  </p>
                  <p className="font-black">
                    {pct(
                      item.meanAbsolutePercentageError,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">
                    Mean absolute error
                  </p>
                  <p className="font-black">
                    {num(item.meanAbsoluteError)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">
                    Avg confidence
                  </p>
                  <p className="font-black">
                    {pct(item.averageConfidence)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">
                    Effectiveness
                  </p>
                  <p className="font-black">
                    {item.recommendationEffectiveness ===
                    null
                      ? "—"
                      : pct(
                          item.recommendationEffectiveness,
                        )}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            B12.3 is analytical only. Accuracy and calibration
            metrics do not automatically update model parameters,
            recommendation thresholds or autonomous execution
            policies.
          </p>
        </div>
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
