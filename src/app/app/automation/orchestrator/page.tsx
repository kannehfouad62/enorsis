import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import {
  discoverAutonomousOrchestrationAction,
  processAutonomousOrchestrationRunAction,
} from "@/modules/autonomous-procurement/orchestrator-actions";
import { getAutonomousOrchestratorWorkspace } from "@/modules/autonomous-procurement/orchestrator-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutonomousOrchestratorPage() {
  const data = await getAutonomousOrchestratorWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B11.1 · Governed Autonomous Procurement
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Autonomous Procurement Orchestrator
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Advance human-released procurement decisions through
            controlled adapters, governed native drafts and native
            Enorsis draft creation. The orchestrator pauses whenever
            a required human release or operator activation has not
            occurred.
          </p>
        </div>

        <form action={discoverAutonomousOrchestrationAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Discover released handoffs
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Runs" value={data.metrics.total} />
        <Metric label="Runnable" value={data.metrics.running} />
        <Metric label="Human-gated" value={data.metrics.paused} />
        <Metric label="Completed" value={data.metrics.completed} />
        <Metric label="Failed" value={data.metrics.failed} />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Orchestration runs
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.runs.length === 0 ? (
            <p className="text-sm text-slate-600">
              No autonomous orchestration runs have been
              discovered.
            </p>
          ) : (
            data.runs.map((run) => (
              <article
                key={run.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {run.status === "PAUSED" ? (
                        <PauseCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-blue-700" />
                      )}
                      <p className="font-black">
                        {run.targetWorkflow.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {run.stage} · {run.status} · attempt{" "}
                      {run.attemptCount}
                    </p>
                    {run.pauseReason ? (
                      <p className="mt-2 text-sm text-amber-800">
                        {run.pauseReason}
                      </p>
                    ) : null}
                    {run.lastError ? (
                      <p className="mt-2 text-sm text-rose-700">
                        {run.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {run.nativeReferenceUrl ? (
                      <Link
                        href={run.nativeReferenceUrl}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
                      >
                        Native record
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}

                    {run.status !== "COMPLETED" ? (
                      <form
                        action={
                          processAutonomousOrchestrationRunAction
                        }
                      >
                        <input
                          type="hidden"
                          name="runId"
                          value={run.id}
                        />
                        <button className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white">
                          Process / resume
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Recent orchestration events
        </h2>
        <div className="mt-4 space-y-3">
          {data.events.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <p className="font-black">{item.eventType}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.fromStage ?? "—"} →{" "}
                {item.toStage ?? "—"}
              </p>
              {item.message ? (
                <p className="mt-2 text-sm text-slate-700">
                  {item.message}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B11.1 never creates a release decision, never activates a
          controlled adapter on behalf of a human, and never posts or
          submits the native transactional record. It automates only
          transitions whose required human gate has already been
          recorded.
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
