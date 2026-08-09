import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getRuntimeLearningTraceWorkspace } from "@/modules/closed-loop-procurement/runtime-trace-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function RuntimeLearningTracePage() {
  const data =
    await getRuntimeLearningTraceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B12.7 · Runtime Learning Observability
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Runtime Policy Decision Traceability
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Audit how governed learning policies influence live
          confidence gates. Each trace records the policy source,
          version, resolved threshold, fallback behavior, input
          value and decision result without altering the underlying
          execution path.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Decision traces"
          value={data.metrics.total}
        />
        <Metric
          label="Active policy rate"
          value={pct(
            data.metrics.activePolicyRate,
          )}
        />
        <Metric
          label="Fallback rate"
          value={pct(
            data.metrics.fallbackRate,
          )}
        />
        <Metric
          label="Clamped decisions"
          value={data.metrics.clamped}
        />
        <Metric
          label="Denied gates"
          value={data.metrics.denied}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Recent runtime policy traces
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.traces.length === 0 ? (
            <p className="text-sm text-slate-600">
              No runtime policy traces have been recorded yet.
            </p>
          ) : (
            data.traces.map((trace) => (
              <article
                key={trace.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {trace.decisionResult === false ? (
                        <XCircle className="h-4 w-4 text-rose-700" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      )}
                      <p className="font-black">
                        {trace.decisionType.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {trace.policySource} ·{" "}
                      {trace.policyKey}
                      {trace.policyVersion === null
                        ? ""
                        : ` · v${trace.policyVersion}`}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {trace.createdAt.toLocaleString()}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Cell
                    label="Input"
                    value={
                      trace.inputValue === null
                        ? "—"
                        : String(trace.inputValue)
                    }
                  />
                  <Cell
                    label="Default"
                    value={String(
                      trace.requestedDefault,
                    )}
                  />
                  <Cell
                    label="Effective"
                    value={String(
                      trace.effectiveValue,
                    )}
                  />
                  <Cell
                    label="Bounded"
                    value={String(
                      trace.boundedValue,
                    )}
                  />
                  <Cell
                    label="Decision"
                    value={
                      trace.decisionResult === null
                        ? "—"
                        : trace.decisionResult
                          ? "ALLOW"
                          : "DENY"
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Policy ID:{" "}
                    {trace.policyId ?? "default"}
                  </span>
                  <span>
                    Proposal ID:{" "}
                    {trace.proposalId ?? "—"}
                  </span>
                  <span>
                    Correlation:{" "}
                    {trace.correlationId ?? "—"}
                  </span>
                  <span>
                    Clamped:{" "}
                    {trace.wasClamped
                      ? "yes"
                      : "no"}
                  </span>
                </div>

                {trace.rationale ? (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {trace.rationale}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Trace guarantees
            </h2>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p>• Policy ID and version are recorded when ACTIVE policy wins.</p>
            <p>• Default fallback decisions are recorded explicitly.</p>
            <p>• Clamping is visible rather than silent.</p>
            <p>• Input value and resolved threshold are preserved.</p>
            <p>• Optional correlation IDs can link traces to upstream AI decisions.</p>
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Runtime boundary
            </h2>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-700">
            B12.7 records the decision made by the governed
            confidence gate. It does not execute procurement work,
            trigger autonomous workflows, change learning policy
            versions or write back to forecasting models.
          </p>
        </article>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Existing callers can continue using the non-tracing gate
          until intentionally migrated. B12.7 provides the traced
          wrapper so runtime adoption can be gradual and
          controlled.
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
