import Link from "next/link";
import { generateAutomationCopilotDraftAction } from "@/modules/enterprise-automation/copilot-actions";
import { getAutomationCopilotWorkspace } from "@/modules/enterprise-automation/copilot-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutomationCopilotPage() {
  const data = await getAutomationCopilotWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            AI Automation Copilot
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Convert procurement automation intent into governed,
            explainable draft workflow designs using the existing
            Enorsis rules, templates, connectors and AI audit layer.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/automation/designer"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Open Automation Designer
          </Link>
          <Link
            href="/app/automation/runtime"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Runtime Workspace
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Tenant rules" value={data.ruleCount} />
        <Metric
          label="Available templates"
          value={data.templateCount}
        />
        <Metric
          label="Active governed connectors"
          value={data.connectorCount}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase text-blue-700">
            Governed design request
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Describe the automation you want
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The Copilot creates a draft design only. It cannot
            activate workflows, release orders, award suppliers,
            execute contracts, release payments or bypass human
            approval.
          </p>
        </div>

        <form
          action={generateAutomationCopilotDraftAction}
          className="mt-5"
        >
          <textarea
            name="intent"
            minLength={20}
            maxLength={8000}
            rows={8}
            required
            placeholder="Example: When a high-value purchase request is approved, validate the supplier, check contract coverage, route exceptions to Procurement, and prepare an ERP purchase-order handoff after final human approval."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Existing tenant rules, templates and active governed
              connectors are supplied as bounded context.
            </p>
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Generate governed draft
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">
              Governed AI history
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Recent automation drafts
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Human review required
          </p>
        </div>

        <div className="mt-5 space-y-5">
          {data.executions.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-600">
                No Automation Copilot drafts have been generated
                for this tenant yet.
              </p>
            </div>
          ) : (
            data.executions.map((execution) => (
              <article key={execution.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {execution.status} · {execution.reviewStatus}
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {execution.model}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{execution.createdAt.toLocaleString()}</p>
                    <p className="mt-1">
                      Confidence:{" "}
                      {execution.confidence ?? "Not scored"}
                    </p>
                  </div>
                </div>

                {execution.outputText ? (
                  <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-sans text-sm leading-7 text-slate-700">
                    {execution.outputText}
                  </pre>
                ) : execution.errorMessage ? (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
                    {execution.errorMessage}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    Draft generation is pending.
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
