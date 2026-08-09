import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  GitBranch,
} from "lucide-react";
import {
  activateLearningPolicyAction,
  materializeApprovedLearningPoliciesAction,
  rollbackLearningPolicyAction,
} from "@/modules/closed-loop-procurement/learning-policy-actions";
import { getLearningPolicyWorkspace } from "@/modules/closed-loop-procurement/learning-policy-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function LearningPoliciesPage() {
  const data = await getLearningPolicyWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B12.5 · Governed Learning Policy
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Learning Policy Activation & Versioning
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Convert approved learning proposals into versioned
            policy candidates. Activation is a separate privileged
            decision, previous versions are superseded rather than
            deleted, and active policies can be rolled back to the
            prior version.
          </p>
        </div>

        <form
          action={
            materializeApprovedLearningPoliciesAction
          }
        >
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Materialize approved proposals
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Candidates"
          value={data.metrics.candidates}
        />
        <Metric
          label="Active policies"
          value={data.metrics.active}
        />
        <Metric
          label="Superseded"
          value={data.metrics.superseded}
        />
        <Metric
          label="Rolled back"
          value={data.metrics.rolledBack}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Versioned learning policies
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.policies.length === 0 ? (
            <p className="text-sm text-slate-600">
              No policy candidates have been materialized.
            </p>
          ) : (
            data.policies.map((policy) => (
              <article
                key={policy.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black">
                      {policy.scopeLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {policy.policyType.replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      · version {policy.version} ·{" "}
                      {policy.status}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {policy.policyKey}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {policy.rationale}
                </p>

                <div className="mt-4 flex flex-wrap gap-5 text-sm">
                  <p>
                    Current:{" "}
                    <strong>
                      {policy.currentValue ?? "—"}
                    </strong>
                  </p>
                  <p>
                    Proposed:{" "}
                    <strong>
                      {policy.proposedValue ?? "—"}
                    </strong>
                  </p>
                  <p>
                    Effective:{" "}
                    <strong>
                      {policy.effectiveValue ?? "—"}
                    </strong>
                  </p>
                </div>

                {policy.status === "CANDIDATE" ? (
                  <form
                    action={
                      activateLearningPolicyAction
                    }
                    className="mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="policyId"
                      value={policy.id}
                    />
                    <input
                      className={input}
                      name="note"
                      placeholder="Activation rationale"
                    />
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activate version
                    </button>
                  </form>
                ) : null}

                {policy.status === "ACTIVE" &&
                policy.version > 1 ? (
                  <form
                    action={
                      rollbackLearningPolicyAction
                    }
                    className="mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="policyId"
                      value={policy.id}
                    />
                    <input
                      className={input}
                      name="note"
                      placeholder="Rollback rationale"
                    />
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black text-white">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Roll back
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
          <ShieldCheck className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Policy event history
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.events.slice(0, 50).map((event) => (
            <article
              key={event.id}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <p className="font-black">
                {event.eventType.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {event.fromStatus ?? "—"} →{" "}
                {event.toStatus ?? "—"} ·{" "}
                {event.createdAt.toLocaleString()}
              </p>
              {event.message ? (
                <p className="mt-2 text-sm text-slate-700">
                  {event.message}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B12.5 activates a governed policy record, not the AI
          runtime itself. No forecasting engine, prompt,
          recommendation threshold or autonomous execution behavior
          reads these policies yet. Runtime consumption is a
          separate integration phase.
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
