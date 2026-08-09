import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  generateCrossEngineGovernanceAssessmentAction,
  resolveCrossEngineConflictAction,
} from "@/modules/ai-governance/cross-engine-governance-actions";
import { getCrossEngineGovernanceWorkspace } from "@/modules/ai-governance/cross-engine-governance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function CrossEngineGovernancePage() {
  const data =
    await getCrossEngineGovernanceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.4 · Cross-Engine Governance
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Cross-Engine Intelligence Governance
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Reconcile predictive procurement, inventory and
            capacity intelligence before high-impact action.
            Conflicts are surfaced with explicit precedence rules
            and require human resolution.
          </p>
        </div>

        <form
          action={
            generateCrossEngineGovernanceAssessmentAction
          }
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Run cross-engine assessment
          </button>
        </form>
      </div>

      {data.latest ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Alignment"
              value={pct(
                data.latest.alignmentScore,
              )}
            />
            <Metric
              label="Open"
              value={data.metrics.open}
            />
            <Metric
              label="Critical"
              value={data.metrics.critical}
            />
            <Metric
              label="High"
              value={data.metrics.high}
            />
            <Metric
              label="Resolved"
              value={data.metrics.resolved}
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Governance conflicts
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              {data.conflicts.length === 0 ? (
                <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    No material cross-engine conflict is detected
                    in the latest intelligence runs.
                  </p>
                </div>
              ) : (
                data.conflicts.map((conflict) => (
                  <article
                    key={conflict.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-700" />
                          <p className="font-black">
                            {conflict.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {conflict.conflictType.replaceAll(
                            "_",
                            " ",
                          )}{" "}
                          · {conflict.severity} ·{" "}
                          {conflict.status}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                        {conflict.precedenceRule.replaceAll(
                          "_",
                          " ",
                        )}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-700">
                      {conflict.rationale}
                    </p>

                    <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                      <p className="font-black">
                        Recommended governance action
                      </p>
                      <p className="mt-1">
                        {conflict.recommendedAction}
                      </p>
                    </div>

                    {conflict.status !== "RESOLVED" ? (
                      <form
                        action={
                          resolveCrossEngineConflictAction
                        }
                        className="mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
                      >
                        <input
                          type="hidden"
                          name="conflictId"
                          value={conflict.id}
                        />
                        <input
                          className={input}
                          name="resolutionNote"
                          placeholder="Document the coordinated governance decision"
                        />
                        <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white">
                          Resolve conflict
                        </button>
                      </form>
                    ) : conflict.resolutionNote ? (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          {conflict.resolutionNote}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <section className={`${card} mt-8`}>
          <p className="text-sm text-slate-600">
            No cross-engine governance assessment has been run yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Assessment history
        </h2>

        <div className="mt-5 space-y-3">
          {data.assessments.map((assessment) => (
            <article
              key={assessment.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  Cross-engine assessment
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {assessment.generatedAt.toLocaleString()} ·{" "}
                  {assessment.conflictCount} conflicts
                </p>
              </div>
              <p className="text-sm font-black text-blue-700">
                {pct(assessment.alignmentScore)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.4 is a governance layer only. It identifies conflicting
        intelligence and establishes precedence, but it does not
        automatically change forecasts, suppress signals, create
        purchase orders, alter inventory or execute capacity
        actions.
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
