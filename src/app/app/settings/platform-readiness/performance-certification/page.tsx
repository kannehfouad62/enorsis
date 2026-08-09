import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { runEnterprisePerformanceCertificationAction } from "@/modules/performance-certification/enterprise-performance-certification-actions";
import { getEnterprisePerformanceCertificationWorkspace } from "@/modules/performance-certification/enterprise-performance-certification-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function ms(value: number) {
  return `${value.toFixed(1)} ms`;
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function EnterprisePerformanceCertificationPage() {
  const data =
    await getEnterprisePerformanceCertificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.6 · Enterprise Scale & Performance
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise Scale & Performance Certification
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Run bounded, read-only performance probes against
            critical database, governance, observability and AI
            aggregation paths. Certification records PASS, WARN and
            FAIL evidence without creating synthetic procurement
            transactions.
          </p>
        </div>

        <form
          action={
            runEnterprisePerformanceCertificationAction
          }
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Run performance certification
          </button>
        </form>
      </div>

      {data.latest ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric
              label="Status"
              value={
                data.latest.status
              }
            />
            <Metric
              label="Score"
              value={pct(
                data.latest
                  .certificationScore,
              )}
            />
            <Metric
              label="Average"
              value={ms(
                data.latest
                  .averageLatencyMs,
              )}
            />
            <Metric
              label="P95"
              value={ms(
                data.latest
                  .p95LatencyMs,
              )}
            />
            <Metric
              label="Warnings"
              value={
                data.latest
                  .warningScenarios
              }
            />
            <Metric
              label="Failed"
              value={
                data.latest
                  .failedScenarios
              }
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Certification scenarios
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {data.results.map(
                (result) => (
                  <article
                    key={result.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {result.status ===
                        "PASS" ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                        ) : result.status ===
                          "WARN" ? (
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                        ) : (
                          <XCircle className="mt-0.5 h-5 w-5 text-rose-700" />
                        )}

                        <div>
                          <p className="font-black">
                            {
                              result.scenarioLabel
                            }
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              result.category
                            }{" "}
                            · target{" "}
                            {ms(
                              result.thresholdMs,
                            )}
                          </p>
                          <p className="mt-2 text-sm text-slate-700">
                            {
                              result.message
                            }
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black">
                          {ms(
                            result.latencyMs,
                          )}
                        </p>
                        <p className="mt-1 text-xs font-black">
                          {
                            result.status
                          }
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        </>
      ) : (
        <section className={`${card} mt-8`}>
          <p className="text-sm text-slate-600">
            No B13.6 performance certification has been run yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Certification history
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  Enterprise performance certification
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
                  {pct(
                    run.certificationScore,
                  )}{" "}
                  · p95{" "}
                  {ms(
                    run.p95LatencyMs,
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.6 uses bounded read-only probes, including a small
        15-operation concurrent read burst. It does not create
        purchase requests, orders, inventory movements, supplier
        records or autonomous execution events.
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
