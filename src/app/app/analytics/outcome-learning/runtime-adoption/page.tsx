import {
  AlertTriangle,
  Eye,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import {
  initializeRuntimePolicyAdoptionAction,
  updateRuntimePolicyAdoptionAction,
} from "@/modules/closed-loop-procurement/runtime-adoption-actions";
import { getRuntimePolicyAdoptionWorkspace } from "@/modules/closed-loop-procurement/runtime-adoption-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function RuntimePolicyAdoptionPage() {
  const data =
    await getRuntimePolicyAdoptionWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B12.8 · Controlled Runtime Adoption
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Predictive Procurement Policy Adoption
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Roll governed learning policy into a single runtime
          decision path using OFF, SHADOW and ENFORCED modes.
          SHADOW compares the governed decision with the existing
          default while preserving the existing behavior.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <Metric
          label="Mode"
          value={data.metrics.mode}
        />
        <Metric
          label="Decisions"
          value={data.metrics.decisionCount}
        />
        <Metric
          label="Shadow differences"
          value={
            data.metrics
              .shadowDifferenceCount
          }
        />
        <Metric
          label="Difference rate"
          value={pct(
            data.metrics
              .shadowDifferenceRate,
          )}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Adoption control
            </h2>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p>
              Decision path:{" "}
              <strong>
                {data.adoption.decisionPath}
              </strong>
            </p>
            <p>
              Policy type:{" "}
              <strong>
                {data.adoption.policyType}
              </strong>
            </p>
            <p>
              Existing default:{" "}
              <strong>
                {data.adoption.defaultThreshold}%
              </strong>
            </p>
          </div>

          <form
            action={
              updateRuntimePolicyAdoptionAction
            }
            className="mt-5 space-y-3"
          >
            <input
              type="hidden"
              name="decisionPath"
              value={
                data.adoption.decisionPath
              }
            />
            <select
              className={`${input} w-full`}
              name="mode"
              defaultValue={
                data.adoption.mode
              }
            >
              <option value="OFF">
                OFF — default behavior only
              </option>
              <option value="SHADOW">
                SHADOW — compare policy, preserve default
              </option>
              <option value="ENFORCED">
                ENFORCED — governed threshold decides
              </option>
            </select>
            <input
              className={`${input} w-full`}
              name="rationale"
              placeholder="Governance rationale"
            />
            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Update adoption mode
            </button>
          </form>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Mode semantics
            </h2>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-700">
            <p>
              <strong>OFF:</strong> existing default decision remains
              authoritative.
            </p>
            <p>
              <strong>SHADOW:</strong> both default and governed
              decisions are calculated and traced, but the existing
              default remains authoritative.
            </p>
            <p>
              <strong>ENFORCED:</strong> the governed threshold becomes
              authoritative for this allowlisted decision path.
            </p>
            <p>
              Direct OFF → ENFORCED transition is blocked.
            </p>
          </div>
        </article>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Adoption history
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.events.length === 0 ? (
            <form
              action={
                initializeRuntimePolicyAdoptionAction
              }
            >
              <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">
                Initialize adoption configuration
              </button>
            </form>
          ) : (
            data.events.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">
                  {event.eventType.replaceAll(
                    "_",
                    " ",
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.fromMode ?? "—"} →{" "}
                  {event.toMode ?? "—"} ·{" "}
                  {event.createdAt.toLocaleString()}
                </p>
                {event.message ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {event.message}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B12.8 creates the controlled adoption gateway but does not
          guess-edit predictive engine internals. The predictive
          procurement engine should be wired to
          evaluateControlledRuntimeConfidence() only after its exact
          local confidence decision point is identified.
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
