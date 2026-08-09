import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  ShieldAlert,
} from "lucide-react";
import {
  acknowledgeAutonomousEscalationAction,
  recoverAutonomousOrchestrationRunAction,
  resolveAutonomousEscalationAction,
} from "@/modules/autonomous-procurement/orchestration-sla-actions";
import { getAutonomousEscalationWorkspace } from "@/modules/autonomous-procurement/orchestration-sla-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function AutonomousEscalationsPage() {
  const data = await getAutonomousEscalationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B11.2 · Orchestration Operations
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Orchestration SLA, Escalation & Recovery
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Detect aging human gates, stuck execution, retry backlog
          and terminal failures. Escalations are durable operational
          records that can be acknowledged, resolved or used to
          recover failed orchestration runs.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open escalations" value={data.metrics.open} />
        <Metric
          label="Acknowledged"
          value={data.metrics.acknowledged}
        />
        <Metric label="Critical" value={data.metrics.critical} />
        <Metric
          label="Recoverable runs"
          value={data.metrics.recoverable}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-700" />
          <h2 className="text-xl font-black">
            SLA escalation register
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.escalations.length === 0 ? (
            <p className="text-sm text-slate-600">
              No orchestration escalations recorded.
            </p>
          ) : (
            data.escalations.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black">
                      {item.escalationType.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.severity} · {item.status} ·{" "}
                      {item.stage} · {item.ageMinutes} min
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {item.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status === "OPEN" ? (
                      <form
                        action={
                          acknowledgeAutonomousEscalationAction
                        }
                      >
                        <input
                          type="hidden"
                          name="escalationId"
                          value={item.id}
                        />
                        <button className="rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white">
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                {item.status !== "RESOLVED" ? (
                  <form
                    action={
                      resolveAutonomousEscalationAction
                    }
                    className="mt-4 flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="escalationId"
                      value={item.id}
                    />
                    <input
                      name="note"
                      className={`${input} min-w-72 flex-1`}
                      placeholder="Resolution note"
                    />
                    <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Governed recovery
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.recoverableRuns.length === 0 ? (
            <p className="text-sm text-slate-600">
              No FAILED or RETRY runs currently require manual
              recovery.
            </p>
          ) : (
            data.recoverableRuns.map((run) => (
              <article
                key={run.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">
                  {run.targetWorkflow.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.stage} · {run.status} · attempt{" "}
                  {run.attemptCount}
                </p>
                {run.lastError ? (
                  <p className="mt-2 text-sm text-rose-700">
                    {run.lastError}
                  </p>
                ) : null}

                <form
                  action={
                    recoverAutonomousOrchestrationRunAction
                  }
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <input
                    type="hidden"
                    name="runId"
                    value={run.id}
                  />
                  <input
                    name="note"
                    className={`${input} min-w-72 flex-1`}
                    placeholder="Recovery rationale"
                  />
                  <button className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white">
                    Reset to READY
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Recovery resets only orchestration runtime state. It does
          not fabricate an approval, activate an adapter, submit a
          Purchase Request, publish a sourcing event, activate a
          resilience plan, validate value, or post inventory.
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
