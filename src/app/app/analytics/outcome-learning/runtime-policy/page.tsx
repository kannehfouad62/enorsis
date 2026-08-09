import {
  AlertTriangle,
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { getRuntimeLearningPolicyWorkspace } from "@/modules/closed-loop-procurement/runtime-policy-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function RuntimeLearningPolicyPage() {
  const data =
    await getRuntimeLearningPolicyWorkspace();

  const resolution =
    data.snapshot.confidenceThreshold;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B12.6 · Safe Runtime Policy
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Runtime Policy Consumption & Guardrails
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Resolve ACTIVE governed learning policies through a
          bounded runtime gateway. Unsupported, inactive, missing
          or invalid policies automatically fall back to the
          caller&apos;s existing default behavior.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Active policies"
          value={data.metrics.activePolicies}
        />
        <Metric
          label="Runtime supported"
          value={data.metrics.runtimeSupported}
        />
        <Metric
          label="Advisory only"
          value={data.metrics.advisoryOnly}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Confidence threshold resolution
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <Row
              label="Sample confidence"
              value={`${data.snapshot.confidence}%`}
            />
            <Row
              label="Default threshold"
              value={`${resolution.requestedDefault}%`}
            />
            <Row
              label="Resolved threshold"
              value={`${resolution.boundedValue}%`}
            />
            <Row
              label="Source"
              value={resolution.source}
            />
            <Row
              label="Policy version"
              value={
                resolution.version === null
                  ? "—"
                  : String(resolution.version)
              }
            />
            <Row
              label="Clamped"
              value={
                resolution.wasClamped
                  ? "Yes"
                  : "No"
              }
            />
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Runtime guardrails
            </h2>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p>• Confidence thresholds are bounded to 0–100.</p>
            <p>• Only ACTIVE policy versions are consumed.</p>
            <p>• Unsupported policy types fall back safely.</p>
            <p>• Missing or invalid numeric values fall back safely.</p>
            <p>• Policy ID and version are exposed for audit evidence.</p>
            <p>• Rollback is effective on the next runtime resolution.</p>
          </div>
        </article>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Active governed policies
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.activePolicies.length === 0 ? (
            <p className="text-sm text-slate-600">
              No ACTIVE learning policies exist. Runtime defaults
              remain authoritative.
            </p>
          ) : (
            data.activePolicies.map((policy) => (
              <article
                key={policy.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {policy.scopeLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {policy.policyType.replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      · v{policy.version} · effective{" "}
                      {policy.effectiveValue ?? "—"}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                    {policy.policyType ===
                    "CONFIDENCE_THRESHOLD"
                      ? "Runtime supported"
                      : "Advisory only"}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B12.6 allows governed policy values to influence a
          confidence gate only through the resolver. It does not
          execute procurement actions, alter database records, or
          permit unsupported review policies to become executable
          runtime logic.
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
