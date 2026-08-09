import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  ShieldPlus,
} from "lucide-react";
import { createNativeRiskResilienceDraftAction } from "@/modules/autonomous-procurement/native-risk-resilience-actions";
import { getNativeRiskResilienceAdapterWorkspace } from "@/modules/autonomous-procurement/native-risk-resilience-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function NativeRiskResilienceAdapterPage() {
  const data =
    await getNativeRiskResilienceAdapterWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B10.3 · Native Autonomous Execution
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Native Risk & Resilience Adapter
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Convert eligible human-governed autonomous risk
          recommendations into real Enorsis Resilience Plans in
          DRAFT status. Activation criteria, recovery objectives,
          alternate-source strategy and operational response remain
          subject to native human governance.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Governed risk drafts"
          value={data.metrics.governedDrafts}
        />
        <Metric
          label="Eligible to create"
          value={data.metrics.eligible}
        />
        <Metric
          label="Native plans created"
          value={data.metrics.nativeCreated}
        />
        <Metric
          label="Recent plan drafts"
          value={data.metrics.draftResiliencePlans}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ShieldPlus className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Create native resilience-plan draft
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.eligibleDrafts.length === 0 ? (
            <p className="text-sm text-slate-600">
              No eligible governed Risk Mitigation drafts are
              awaiting native creation.
            </p>
          ) : (
            data.eligibleDrafts.map((draft) => (
              <article
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-black">
                    {draft.draftTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {draft.status} ·{" "}
                    {draft.nativeReferenceType}
                  </p>
                </div>

                <form
                  action={
                    createNativeRiskResilienceDraftAction
                  }
                >
                  <input
                    type="hidden"
                    name="nativeDraftId"
                    value={draft.id}
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                    Create resilience draft
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Autonomous resilience handoffs
        </h2>

        <div className="mt-4 space-y-3">
          {data.drafts
            .filter(
              (draft) => draft.nativeReferenceId,
            )
            .map((draft) => (
              <article
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black">
                    {draft.draftTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {draft.status} · Native ID{" "}
                    {draft.nativeReferenceId}
                  </p>
                </div>

                <Link
                  href={
                    draft.nativeReferenceUrl ??
                    "/app/resilience"
                  }
                  className="inline-flex items-center gap-2 text-xs font-black text-blue-700"
                >
                  Open Risk & Resilience
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B10.3 creates only a DRAFT Resilience Plan. It does not
          activate the plan, declare a disruption, alter inventory,
          change suppliers, reroute logistics, close a risk event or
          claim that the modeled risk has been mitigated.
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
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}
