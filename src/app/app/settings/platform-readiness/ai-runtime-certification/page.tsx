import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { runAiRuntimeCertificationAction } from "@/modules/ai-certification/runtime-certification-actions";
import { getAiRuntimeCertificationWorkspace } from "@/modules/ai-certification/runtime-certification-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AiRuntimeCertificationPage() {
  const data =
    await getAiRuntimeCertificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.1 · Production Intelligence Certification
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed AI Runtime Certification
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Execute a non-destructive certification suite across
            runtime policy bounds, version integrity, fallback
            behavior, trace consistency, SHADOW safety, promotion
            guardrails and human activation evidence.
          </p>
        </div>

        <form action={runAiRuntimeCertificationAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Run certification
          </button>
        </form>
      </div>

      {data.latest ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Status"
              value={data.latest.status}
            />
            <Metric
              label="Score"
              value={pct(
                data.latest.certificationScore,
              )}
            />
            <Metric
              label="Passed"
              value={data.latest.passedScenarios}
            />
            <Metric
              label="Warnings"
              value={data.latest.warningScenarios}
            />
            <Metric
              label="Failed"
              value={data.latest.failedScenarios}
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Latest certification scenarios
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {data.results.map((result) => (
                <article
                  key={result.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {result.status === "PASS" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                      ) : result.status === "WARN" ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 text-rose-700" />
                      )}

                      <div>
                        <p className="font-black">
                          {result.scenarioLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {result.category.replaceAll(
                            "_",
                            " ",
                          )}{" "}
                          · {result.severity} ·{" "}
                          {result.durationMs} ms
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {result.message}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {result.status}
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
            No AI runtime certification has been executed yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Certification history
        </h2>

        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {run.certificationKey}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {run.createdAt.toLocaleString()} ·{" "}
                  {run.totalScenarios} scenarios
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-black">
                  {run.status}
                </p>
                <p className="text-xs text-slate-500">
                  {pct(run.certificationScore)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.1 certification is non-destructive. It does not promote
        policies, alter runtime modes, execute procurement actions
        or retrain models. Only certification run/result records are
        written.
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
