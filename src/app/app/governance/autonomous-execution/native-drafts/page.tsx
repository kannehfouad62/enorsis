import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileInput,
} from "lucide-react";
import {
  completeNativeWorkflowDraftAction,
  materializeNativeWorkflowDraftAction,
  openNativeWorkflowAction,
} from "@/modules/autonomous-procurement/native-workflow-draft-actions";
import { getNativeWorkflowDraftWorkspace } from "@/modules/autonomous-procurement/native-workflow-draft-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function NativeWorkflowDraftsPage() {
  const data = await getNativeWorkflowDraftWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B9.5 · Human-Governed Autonomous Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Governed Native Workflow Drafts
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Materialize activated transaction-adapter jobs into
          governed native draft objects, open the corresponding
          Enorsis workflow, and bind the handoff to the native record
          created or confirmed by an authorized operator.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Native drafts" value={data.metrics.total} />
        <Metric label="Materialized" value={data.metrics.materialized} />
        <Metric label="Workflow opened" value={data.metrics.opened} />
        <Metric label="Native confirmed" value={data.metrics.confirmed} />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <FileInput className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Materialize governed native draft
          </h2>
        </div>

        <form
          action={materializeNativeWorkflowDraftAction}
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-80 flex-1 text-xs font-black uppercase text-slate-500">
            Activated adapter job
            <select
              className={`${input} mt-2 block w-full`}
              name="adapterJobId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select activated adapter job
              </option>
              {data.availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.targetWorkflow.replaceAll("_", " ")} ·{" "}
                  {job.nativeReferenceType ?? "Native record"}
                </option>
              ))}
            </select>
          </label>

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Materialize draft
          </button>
        </form>
      </section>

      {data.latestDraft ? (
        <section className={`${card} mt-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">
                {data.latestDraft.status}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {data.latestDraft.draftTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {data.latestDraft.nativeReferenceType}
              </p>
            </div>

            <Link
              href={data.latestDraft.nativeRoute}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black"
            >
              Open native workflow
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {data.latestDraft.status === "DRAFT_MATERIALIZED" ? (
            <form action={openNativeWorkflowAction} className="mt-5">
              <input
                type="hidden"
                name="nativeDraftId"
                value={data.latestDraft.id}
              />
              <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                Record workflow opening
              </button>
            </form>
          ) : null}

          {[
            "DRAFT_MATERIALIZED",
            "NATIVE_WORKFLOW_OPENED",
          ].includes(data.latestDraft.status) ? (
            <form
              action={completeNativeWorkflowDraftAction}
              className="mt-6 grid gap-3 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="nativeDraftId"
                value={data.latestDraft.id}
              />
              <input
                className={input}
                name="nativeReferenceId"
                required
                placeholder="Native record ID / number"
              />
              <input
                className={input}
                name="nativeReferenceUrl"
                placeholder="Native record URL (optional)"
              />
              <textarea
                className={`${input} min-h-24 md:col-span-2`}
                name="note"
                placeholder="Completion note / native workflow controls confirmed"
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white md:col-span-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirm native draft record
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Native draft history</h2>
        <div className="mt-4 space-y-3">
          {data.drafts.map((draft) => (
            <article
              key={draft.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">{draft.draftTitle}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {draft.targetWorkflow.replaceAll("_", " ")} ·{" "}
                  {draft.status}
                </p>
              </div>
              <Link
                href={draft.nativeReferenceUrl ?? draft.nativeRoute}
                className="text-xs font-black text-blue-700"
              >
                Open workflow
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          B9.5 does not bypass native Enorsis module contracts or
          approvals. It materializes a governed native draft and
          requires an authorized operator to create or confirm the
          corresponding native record. Direct module-level database
          creation should only be enabled after each local native
          model contract is verified.
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
