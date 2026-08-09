import {
  BellRing,
  CheckCircle2,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import { getAutonomousSignalWorkspace } from "@/modules/autonomous-procurement/orchestration-signal-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutonomousSignalsPage() {
  const data = await getAutonomousSignalWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B11.3 · Event-Driven Orchestration
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Orchestration Resume Signals
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Receive idempotent internal lifecycle signals and wake
          paused autonomous-procurement runs only after the
          orchestrator independently verifies that the required
          governance state is present in the database.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Received" value={data.metrics.received} />
        <Metric label="Processed" value={data.metrics.processed} />
        <Metric label="Ignored" value={data.metrics.ignored} />
        <Metric label="Failed" value={data.metrics.failed} />
        <Metric
          label="Paused runs"
          value={data.metrics.pausedRuns}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Recent resume signals
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.signals.length === 0 ? (
            <p className="text-sm text-slate-600">
              No orchestration resume signals recorded.
            </p>
          ) : (
            data.signals.map((signal) => (
              <article
                key={signal.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black">
                      {signal.signalType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {signal.status} · {signal.source}
                    </p>
                    {signal.processingResult ? (
                      <p className="mt-2 text-sm text-slate-700">
                        {signal.processingResult}
                      </p>
                    ) : null}
                  </div>

                  {signal.status === "PROCESSED" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <PauseCircle className="h-5 w-5 text-amber-700" />
          <h2 className="text-xl font-black">
            Paused orchestration runs
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.pausedRuns.length === 0 ? (
            <p className="text-sm text-slate-600">
              No orchestration runs are currently paused.
            </p>
          ) : (
            data.pausedRuns.map((run) => (
              <article
                key={run.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">
                  {run.targetWorkflow.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.stage} · {run.status}
                </p>
                {run.pauseReason ? (
                  <p className="mt-2 text-sm text-amber-800">
                    {run.pauseReason}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        A resume signal is advisory, not authoritative. The runtime
        never trusts a callback to prove approval or activation; it
        re-reads the execution envelope, adapter job or native draft
        before advancing the run.
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
