import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Cable,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  decideAdapterJobAction,
  prepareAdapterJobAction,
} from "@/modules/autonomous-procurement/transaction-adapter-actions";
import { getTransactionAdapterWorkspace } from "@/modules/autonomous-procurement/transaction-adapter-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function TransactionAdaptersPage() {
  const data = await getTransactionAdapterWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B9.4 · Human-Governed Autonomous Procurement
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Controlled Transaction Adapters
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Convert released execution handoffs into idempotent,
          operator-controlled draft jobs for native Enorsis
          workflows. Adapters prepare governed payloads and launch
          points without bypassing the native workflow&apos;s own
          approvals, validations, or transaction controls.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Adapter jobs" value={data.metrics.jobs} />
        <Metric
          label="Draft ready"
          value={data.metrics.draftReady}
        />
        <Metric
          label="Activated"
          value={data.metrics.activated}
        />
        <Metric
          label="Completed"
          value={data.metrics.completed}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Cable className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Prepare native workflow draft
          </h2>
        </div>

        <form
          action={prepareAdapterJobAction}
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-80 flex-1 text-xs font-black uppercase text-slate-500">
            Released handoff
            <select
              className={`${input} mt-2 block w-full`}
              name="handoffId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select released handoff
              </option>
              {data.availableHandoffs.map((handoff) => (
                <option key={handoff.id} value={handoff.id}>
                  {handoff.targetWorkflow.replaceAll(
                    "_",
                    " ",
                  )}{" "}
                  → {handoff.adapter?.nativeRoute}
                </option>
              ))}
            </select>
          </label>

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Prepare adapter draft
          </button>
        </form>
      </section>

      {data.latestJob ? (
        <section className={`${card} mt-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">
                {data.latestJob.status}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {data.latestJob.targetWorkflow.replaceAll(
                  "_",
                  " ",
                )}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Adapter: {data.latestJob.adapterKey}
              </p>
            </div>

            <Link
              href={data.latestJob.nativeRoute}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black"
            >
              Open native workflow
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {data.latestJob.status === "DRAFT_READY" ? (
            <form
              action={decideAdapterJobAction}
              className="mt-6"
            >
              <input
                type="hidden"
                name="adapterJobId"
                value={data.latestJob.id}
              />
              <textarea
                className={`${input} min-h-24 w-full`}
                name="reason"
                placeholder="Operator rationale / conditions"
              />

              <div className="mt-3 flex gap-3">
                <button
                  name="decision"
                  value="ACTIVATE"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Activate native draft handoff
                </button>

                <button
                  name="decision"
                  value="CANCEL"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Adapter job history
        </h2>
        <div className="mt-4 space-y-3">
          {data.jobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-black">
                  {job.targetWorkflow.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {job.adapterKey} · {job.status}
                </p>
              </div>
              <Link
                href={job.nativeRoute}
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
          B9.4 prepares and activates governed native-workflow draft
          handoffs. It intentionally does not bypass the existing
          requisition, sourcing, inventory, risk, or value-realization
          workflow logic. Native records must still be created or
          confirmed inside their corresponding Enorsis workflow and
          remain subject to its approvals.
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
