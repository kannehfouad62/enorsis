import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
} from "lucide-react";
import { createNativeValueRealizationDraftAction } from "@/modules/autonomous-procurement/native-value-realization-actions";
import { getNativeValueRealizationAdapterWorkspace } from "@/modules/autonomous-procurement/native-value-realization-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function NativeValueRealizationAdapterPage() {
  const data =
    await getNativeValueRealizationAdapterWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B10.4 · Native Autonomous Execution
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Native Value Realization Adapter
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Convert eligible human-governed autonomous savings
          opportunities into real Enorsis Procurement Value
          Initiatives in QUALIFYING status. Benefit evidence,
          finance validation and realized savings remain controlled
          by the native value-realization workflow.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Governed value drafts"
          value={data.metrics.governedDrafts}
        />
        <Metric
          label="Eligible to create"
          value={data.metrics.eligible}
        />
        <Metric
          label="Native initiatives created"
          value={data.metrics.nativeCreated}
        />
        <Metric
          label="Qualifying initiatives"
          value={data.metrics.qualifyingInitiatives}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Create native value initiative
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.eligibleDrafts.length === 0 ? (
            <p className="text-sm text-slate-600">
              No eligible governed Value Realization drafts are
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
                    createNativeValueRealizationDraftAction
                  }
                >
                  <input
                    type="hidden"
                    name="nativeDraftId"
                    value={draft.id}
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                    Create qualifying initiative
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Autonomous value handoffs
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
                    "/app/value-realization"
                  }
                  className="inline-flex items-center gap-2 text-xs font-black text-blue-700"
                >
                  Open Value Realization
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B10.4 creates only a QUALIFYING value initiative. Target
          and forecast amounts remain hypotheses. It does not submit
          benefit evidence, validate benefits, book realized savings
          or claim finance approval.
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
