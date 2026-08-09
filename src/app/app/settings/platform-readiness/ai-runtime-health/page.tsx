import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { captureAiRuntimeHealthSnapshotAction } from "@/modules/ai-monitoring/runtime-health-actions";
import { getAiRuntimeHealthWorkspace } from "@/modules/ai-monitoring/runtime-health-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AiRuntimeHealthPage() {
  const data =
    await getAiRuntimeHealthWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.2 · Production Monitoring
          </p>
          <h1 className="mt-3 text-4xl font-black">
            AI Runtime Health & Production Monitoring
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Monitor runtime policy usage, fallback behavior,
            denials, clamping, trace integrity, certification state
            and adoption mode without changing live AI decisions.
          </p>
        </div>

        <form action={captureAiRuntimeHealthSnapshotAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Capture health snapshot
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Status"
          value={data.current.status}
        />
        <Metric
          label="Health score"
          value={pct(
            data.current.healthScore,
          )}
        />
        <Metric
          label="Decisions"
          value={
            data.current.metrics
              .decisionCount
          }
        />
        <Metric
          label="Fallback"
          value={pct(
            data.current.metrics
              .fallbackRate,
          )}
        />
        <Metric
          label="Trace integrity"
          value={pct(
            data.current.metrics
              .traceIntegrityRate,
          )}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Runtime indicators
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <Row
              label="Adoption mode"
              value={
                data.current.metrics
                  .adoptionMode
              }
            />
            <Row
              label="Active policy rate"
              value={pct(
                data.current.metrics
                  .activePolicyRate,
              )}
            />
            <Row
              label="Denied rate"
              value={pct(
                data.current.metrics
                  .deniedRate,
              )}
            />
            <Row
              label="Clamped rate"
              value={pct(
                data.current.metrics
                  .clampedRate,
              )}
            />
            <Row
              label="Runtime policies"
              value={String(
                data.current.metrics
                  .activePolicyCount,
              )}
            />
            <Row
              label="Advisory policies"
              value={String(
                data.current.metrics
                  .advisoryPolicyCount,
              )}
            />
            <Row
              label="Latest certification"
              value={
                data.current.metrics
                  .certificationStatus ??
                "—"
              }
            />
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-700" />
            <h2 className="text-xl font-black">
              Health anomalies
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.current.anomalies.length === 0 ? (
              <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  No runtime health anomaly is currently detected.
                </p>
              </div>
            ) : (
              data.current.anomalies.map((anomaly) => (
                <div
                  key={anomaly.key}
                  className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-black">
                      {anomaly.key.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                    <p className="mt-1">
                      {anomaly.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Health snapshot history
        </h2>

        <div className="mt-5 space-y-3">
          {data.snapshots.length === 0 ? (
            <p className="text-sm text-slate-600">
              No health snapshots captured yet.
            </p>
          ) : (
            data.snapshots.map((snapshot) => (
              <article
                key={snapshot.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black">
                    {snapshot.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {snapshot.capturedAt.toLocaleString()} ·{" "}
                    {snapshot.decisionCount} decisions ·{" "}
                    {snapshot.anomalyCount} anomalies
                  </p>
                </div>

                <p className="text-sm font-black text-blue-700">
                  {pct(snapshot.healthScore)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.2 is observational only. Health snapshots and anomaly
        detection do not modify learning policies, runtime modes,
        forecasts, recommendations or autonomous execution.
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
      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </article>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
      <span className="text-sm font-black">
        {label}
      </span>
      <span className="text-sm font-black text-blue-700">
        {value}
      </span>
    </div>
  );
}
