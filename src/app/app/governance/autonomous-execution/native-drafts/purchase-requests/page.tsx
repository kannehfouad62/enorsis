import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  FilePlus2,
} from "lucide-react";
import { createNativePurchaseRequestDraftAction } from "@/modules/autonomous-procurement/native-purchase-request-actions";
import { getNativePurchaseRequestAdapterWorkspace } from "@/modules/autonomous-procurement/native-purchase-request-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function NativePurchaseRequestAdapterPage() {
  const data =
    await getNativePurchaseRequestAdapterWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B10.1 · Native Autonomous Execution
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Native Purchase Request Adapter
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Convert eligible human-governed autonomous native drafts
          into real Enorsis Purchase Requests in DRAFT status. The
          native requisition workflow remains responsible for
          submission, approval routing, escalation, SLA controls and
          final approval.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Governed PR drafts"
          value={data.metrics.governedDrafts}
        />
        <Metric
          label="Eligible to create"
          value={data.metrics.eligible}
        />
        <Metric
          label="Native records created"
          value={data.metrics.nativeCreated}
        />
        <Metric
          label="Recent PR drafts"
          value={data.metrics.draftPurchaseRequests}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <FilePlus2 className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Create native Purchase Request draft
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.eligibleDrafts.length === 0 ? (
            <p className="text-sm text-slate-600">
              No eligible governed Purchase Request drafts are
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
                    createNativePurchaseRequestDraftAction
                  }
                >
                  <input
                    type="hidden"
                    name="nativeDraftId"
                    value={draft.id}
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                    Create PR draft
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Autonomous Purchase Request handoffs
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
                    `/app/requests/${draft.nativeReferenceId}`
                  }
                  className="inline-flex items-center gap-2 text-xs font-black text-blue-700"
                >
                  Open Purchase Request
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B10.1 creates Purchase Requests only in DRAFT status. It
          does not submit the requisition, generate approval
          decisions, approve the request, create a purchase order or
          initiate payment. Those controls remain inside the
          existing Enorsis requisition-to-order process.
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
