import Link from "next/link";
import {
  ArrowUpRight,
  DatabaseZap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  reconcileClosedLoopOutcomeAction,
  reconcileClosedLoopOutcomesAction,
} from "@/modules/closed-loop-procurement/native-reconciliation-actions";
import { getNativeOutcomeReconciliationWorkspace } from "@/modules/closed-loop-procurement/native-reconciliation-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function NativeOutcomeReconciliationPage() {
  const data =
    await getNativeOutcomeReconciliationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B12.2 · Closed-Loop Procurement Intelligence
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Automatic Native Outcome Reconciliation
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Read observable facts directly from native Enorsis
            records and reconcile them into the governed
            closed-loop dataset. Native status, value, quantity and
            realized benefit are recorded as observations without
            inferring outcomes that the transactional system cannot
            prove.
          </p>
        </div>

        <form
          action={
            reconcileClosedLoopOutcomesAction
          }
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Reconcile native outcomes
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Native outcome cases"
          value={data.metrics.outcomes}
        />
        <Metric
          label="Automatic observations"
          value={
            data.metrics
              .automaticObservations
          }
        />
        <Metric
          label="Observed metrics"
          value={data.metrics.observed}
        />
        <Metric
          label="Validated metrics"
          value={data.metrics.validated}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Native reconciliation cases
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.outcomes.length === 0 ? (
            <p className="text-sm text-slate-600">
              No closed-loop outcomes with native references are
              available.
            </p>
          ) : (
            data.outcomes.map((outcome) => {
              const metrics =
                data.byOutcome.get(
                  outcome.id,
                ) ?? [];

              return (
                <article
                  key={outcome.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {outcome.targetWorkflow.replaceAll(
                          "_",
                          " ",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {outcome.status} ·{" "}
                        {outcome.nativeReferenceType ??
                          "Native record"}{" "}
                        ·{" "}
                        {outcome.nativeReferenceId}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {outcome.nativeReferenceUrl ? (
                        <Link
                          href={
                            outcome.nativeReferenceUrl
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
                        >
                          Native record
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}

                      <form
                        action={
                          reconcileClosedLoopOutcomeAction
                        }
                      >
                        <input
                          type="hidden"
                          name="outcomeId"
                          value={outcome.id}
                        />
                        <button className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white">
                          Reconcile
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {metrics.map(
                      (metric) => (
                        <div
                          key={metric.id}
                          className="rounded-2xl bg-slate-50 p-4"
                        >
                          <p className="text-sm font-black">
                            {metric.metricLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            predicted{" "}
                            {metric.predictedValue ??
                              "—"}{" "}
                            {metric.unit ?? ""}
                            {" · "}actual{" "}
                            {metric.actualValue ??
                              "—"}{" "}
                            {metric.unit ?? ""}
                          </p>
                          <p className="mt-2 text-xs font-black text-blue-700">
                            {metric.status}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Native reconciliation records facts, not interpretations.
          For example, an APPROVED Purchase Request proves approval;
          it does not prove savings. A POSTED transfer proves stock
          movement; it does not prove the optimization recommendation
          was economically successful.
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
