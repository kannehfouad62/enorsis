import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  GitMerge,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { getEnterpriseAiControlCenter } from "@/modules/ai-control-center/control-center-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function EnterpriseAiControlCenterPage() {
  const data =
    await getEnterpriseAiControlCenter();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B13.5 · Enterprise AI Control Center
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Enterprise AI Control Center
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          A consolidated governance plane for AI providers,
          certification, runtime health, engine adoption, active
          policies, promotion state, runtime traces and cross-engine
          conflicts.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Runtime health"
          value={data.health.status}
        />
        <Metric
          label="Health score"
          value={pct(
            data.health.healthScore,
          )}
        />
        <Metric
          label="Providers"
          value={
            data.summary.configuredProviders
          }
        />
        <Metric
          label="Active policies"
          value={
            data.summary.activePolicies
          }
        />
        <Metric
          label="ENFORCED engines"
          value={
            data.summary.enforcedEngines
          }
        />
        <Metric
          label="Open conflicts"
          value={
            data.openCrossEngineConflicts
          }
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <article className={card}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Governance readiness
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <Row
              label="Certification"
              value={
                data.latestCertification
                  ?.status ?? "NOT_RUN"
              }
            />
            <Row
              label="Certification score"
              value={
                data.latestCertification
                  ? pct(
                      data.latestCertification
                        .certificationScore,
                    )
                  : "—"
              }
            />
            <Row
              label="Cross-engine alignment"
              value={
                data.latestCrossEngineAssessment
                  ? pct(
                      data.latestCrossEngineAssessment
                        .alignmentScore,
                    )
                  : "—"
              }
            />
            <Row
              label="Governance ready"
              value={
                data.summary.governanceReady
                  ? "YES"
                  : "NO"
              }
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <QuickLink
              href="/app/settings/platform-readiness/ai-runtime-certification"
              label="Certification"
            />
            <QuickLink
              href="/app/settings/platform-readiness/ai-runtime-health"
              label="Runtime health"
            />
            <QuickLink
              href="/app/settings/platform-readiness/cross-engine-governance"
              label="Cross-engine governance"
            />
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Intelligence engine modes
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.adoptions.length === 0 ? (
              <p className="text-sm text-slate-600">
                No runtime adoption records exist.
              </p>
            ) : (
              data.adoptions.map((adoption) => (
                <div
                  key={adoption.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">
                        {adoption.decisionPath.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {adoption.decisionCount} decisions ·{" "}
                        {adoption.shadowDifferenceCount} differences
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                      {adoption.mode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5">
            <QuickLink
              href="/app/settings/platform-readiness/ai-engine-adoption"
              label="Manage engine adoption"
            />
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              AI provider readiness
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.providers.map((provider) => (
              <div
                key={provider.key}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-black">
                    {provider.label}
                  </span>
                </div>
                <span
                  className={`text-xs font-black ${
                    provider.configured
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }`}
                >
                  {provider.mode.replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Provider secrets are never displayed. The Control
            Center reports configuration presence only.
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={card}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Governed learning policies
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {data.activePolicies.length === 0 ? (
              <p className="text-sm text-slate-600">
                No ACTIVE governed learning policy exists.
              </p>
            ) : (
              data.activePolicies
                .slice(0, 12)
                .map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {policy.scopeLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {policy.policyType.replaceAll(
                            "_",
                            " ",
                          )}{" "}
                          · v{policy.version}
                        </p>
                      </div>
                      <span className="text-xs font-black text-blue-700">
                        {policy.effectiveValue ??
                          "—"}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <QuickLink
              href="/app/analytics/outcome-learning/policies"
              label="Policy versions"
            />
            <QuickLink
              href="/app/analytics/outcome-learning/runtime-promotion"
              label="Promotion governance"
            />
          </div>
        </article>

        <article className={card}>
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black">
              Decision & conflict posture
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Row
              label="Runtime decisions"
              value={String(
                data.health.metrics
                  .decisionCount,
              )}
            />
            <Row
              label="Fallback rate"
              value={pct(
                data.health.metrics
                  .fallbackRate,
              )}
            />
            <Row
              label="Denied rate"
              value={pct(
                data.health.metrics
                  .deniedRate,
              )}
            />
            <Row
              label="Trace integrity"
              value={pct(
                data.health.metrics
                  .traceIntegrityRate,
              )}
            />
          </div>

          <div className="mt-5 space-y-3">
            {data.latestRuntimeTraces
              .slice(0, 6)
              .map((trace) => (
                <div
                  key={trace.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">
                        {trace.decisionType.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trace.policySource} ·{" "}
                        {trace.createdAt.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-black">
                      {trace.decisionResult === null
                        ? "TRACE"
                        : trace.decisionResult
                          ? "ALLOW"
                          : "DENY"}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <QuickLink
              href="/app/analytics/outcome-learning/runtime-traces"
              label="Decision traces"
            />
            <QuickLink
              href="/app/settings/platform-readiness/cross-engine-governance"
              label="Open governance conflicts"
            />
          </div>
        </article>
      </section>

      {!data.summary.governanceReady ? (
        <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            The AI governance posture is not yet fully ready. A
            clean certification, HEALTHY runtime status and zero
            open cross-engine conflicts are required before the
            Control Center reports governance readiness.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Current AI governance posture meets the B13.5 control
            center readiness criteria.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Activity className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B13.5 is an administrative aggregation layer. It does not
          expose provider secrets, change AI policies, promote
          runtime modes or execute procurement transactions.
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

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
    >
      {label}
    </Link>
  );
}
