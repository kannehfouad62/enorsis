import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CircleGauge,
  Clock3,
  GitBranch,
  Signal,
} from "lucide-react";
import { getAutonomousOrchestrationObservabilityWorkspace } from "@/modules/autonomous-procurement/orchestration-observability-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function mins(value: number) {
  if (value < 60) {
    return `${value.toFixed(0)} min`;
  }

  return `${(value / 60).toFixed(1)} hr`;
}

export default async function OrchestrationObservabilityPage() {
  const data =
    await getAutonomousOrchestrationObservabilityWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B11.4 · Orchestration Observability
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Run Trace & Operational Metrics
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Observe the complete autonomous procurement
          orchestration lifecycle across human gates,
          controlled adapters, native draft execution,
          recovery, escalation and event-driven resume
          signals.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Completion rate"
          value={pct(
            data.metrics.completionRate,
          )}
        />
        <Metric
          label="Failure rate"
          value={pct(data.metrics.failureRate)}
        />
        <Metric
          label="Average cycle"
          value={mins(
            data.metrics.averageCycleMinutes,
          )}
        />
        <Metric
          label="P95 cycle"
          value={mins(
            data.metrics.p95CycleMinutes,
          )}
        />
        <Metric
          label="Active runs"
          value={data.metrics.activeRuns}
        />
        <Metric
          label="Human-gated"
          value={data.metrics.pausedRuns}
        />
        <Metric
          label="Open escalations"
          value={data.metrics.openEscalations}
        />
        <Metric
          label="Signal success"
          value={pct(
            data.metrics.signalSuccessRate,
          )}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Stage distribution
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.stageDistribution.map(
              (item) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <span className="text-sm font-black">
                    {item.stage.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>
                  <span className="text-sm font-black text-blue-700">
                    {item.count}
                  </span>
                </div>
              ),
            )}
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <CircleGauge className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Workflow performance
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.workflowDistribution.map(
              (item) => (
                <div
                  key={item.workflow}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black">
                      {item.workflow.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                    <p className="text-sm font-black text-blue-700">
                      {pct(
                        item.completionRate,
                      )}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.total} runs ·{" "}
                    {item.completed} complete ·{" "}
                    {item.paused} paused ·{" "}
                    {item.failed} failed
                  </p>
                </div>
              ),
            )}
          </div>
        </article>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Recent run traces
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.runs.slice(0, 30).map((run) => {
            const trace =
              data.traceByRun.get(run.id) ?? [];

            return (
              <article
                key={run.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black">
                      {run.targetWorkflow.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {run.stage} · {run.status} ·{" "}
                      {run.attemptCount} attempts
                    </p>
                  </div>

                  {run.nativeReferenceUrl ? (
                    <Link
                      href={
                        run.nativeReferenceUrl
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
                    >
                      Native record
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>

                {run.pauseReason ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {run.pauseReason}
                  </p>
                ) : null}

                {run.lastError ? (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {run.lastError}
                  </p>
                ) : null}

                <div className="mt-4 space-y-2 border-l-2 border-slate-200 pl-4">
                  {trace
                    .slice()
                    .reverse()
                    .slice(-12)
                    .map((item) => (
                      <div key={item.id}>
                        <p className="text-xs font-black">
                          {item.eventType.replaceAll(
                            "_",
                            " ",
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.fromStage ?? "—"} →{" "}
                          {item.toStage ?? "—"} ·{" "}
                          {item.createdAt.toLocaleString()}
                        </p>
                        {item.message ? (
                          <p className="mt-1 text-sm text-slate-700">
                            {item.message}
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <Signal className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Event distribution
            </h2>
          </div>

          <div className="mt-5 space-y-2">
            {data.eventDistribution
              .slice(0, 15)
              .map((item) => (
                <div
                  key={item.eventType}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <span className="text-xs font-black">
                    {item.eventType.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    {item.count}
                  </span>
                </div>
              ))}
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Operational pressure
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <Pressure
              label="Critical escalations"
              value={
                data.metrics
                  .criticalEscalations
              }
            />
            <Pressure
              label="Ignored resume signals"
              value={
                data.metrics.ignoredSignals
              }
            />
            <Pressure
              label="Failed runs"
              value={data.metrics.failedRuns}
            />
            <Pressure
              label="Paused runs"
              value={data.metrics.pausedRuns}
            />
          </div>
        </article>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B11.4 is read-only operational observability.
          It does not advance runs, resolve escalations,
          create approvals, activate adapters or execute
          native transactions.
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

function Pressure({
  label,
  value,
}: {
  label: string;
  value: number;
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
