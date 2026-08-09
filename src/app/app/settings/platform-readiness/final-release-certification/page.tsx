import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { runFinalEnterpriseReleaseCertificationAction } from "@/modules/release-certification/final-enterprise-release-certification-actions";
import { getFinalEnterpriseReleaseCertificationWorkspace } from "@/modules/release-certification/final-enterprise-release-certification-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function FinalEnterpriseReleaseCertificationPage() {
  const data =
    await getFinalEnterpriseReleaseCertificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.8 · Final Enterprise Release Certification
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Final Enterprise Release Certification
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Aggregate the final B-series certification chain into a
            single GO, CONDITIONAL GO or HOLD release decision.
          </p>
        </div>

        <form action={runFinalEnterpriseReleaseCertificationAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Run final certification
          </button>
        </form>
      </div>

      {data.latest ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric
              label="Decision"
              value={data.latest.decision}
            />
            <Metric
              label="Status"
              value={data.latest.status}
            />
            <Metric
              label="Readiness"
              value={pct(
                data.latest.readinessScore,
              )}
            />
            <Metric
              label="Passed"
              value={data.latest.passedGates}
            />
            <Metric
              label="Warnings"
              value={data.latest.warningGates}
            />
            <Metric
              label="Failed"
              value={data.latest.failedGates}
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Final release gates
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {data.gates.map((gate) => (
                <article
                  key={gate.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {gate.status === "PASS" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                      ) : gate.status === "WARN" ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 text-rose-700" />
                      )}

                      <div>
                        <p className="font-black">
                          {gate.gateLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {gate.category.replaceAll(
                            "_",
                            " ",
                          )}{" "}
                          · {gate.severity}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {gate.message}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {gate.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={`${card} mt-8`}>
          <p className="text-sm text-slate-600">
            No B13.8 final release certification has been run yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Final certification history
        </h2>

        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {run.releaseKey}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.createdAt.toLocaleString()} ·{" "}
                  {run.totalGates} gates
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-black">
                  {run.decision}
                </p>
                <p className="text-xs text-slate-500">
                  {pct(run.readinessScore)} ·{" "}
                  {run.status}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.8 does not change runtime modes, policies, providers,
        transactions or deployment configuration. It records the
        final release decision from existing certification and
        governance evidence.
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
