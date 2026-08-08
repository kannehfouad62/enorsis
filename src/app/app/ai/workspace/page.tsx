import Link from "next/link";
import { BrainCircuit, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { askUnifiedProcurementAiAction } from "@/modules/ai-rag/actions";
import { getUnifiedProcurementAiWorkspace } from "@/modules/ai-rag/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function UnifiedProcurementAiPage() {
  const data = await getUnifiedProcurementAiWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B4.1 · Governed Retrieval
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Unified Procurement AI
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Ask procurement questions grounded in tenant contracts,
            supplier master data, enterprise policies and configured
            workflow procedures while preserving Enorsis governance,
            human review and auditability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/agents"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            AI Skills
          </Link>
          <Link
            href="/app/automation/copilot"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Automation Copilot
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Contracts" value={data.coverage.contracts} />
        <Metric label="Suppliers" value={data.coverage.suppliers} />
        <Metric label="Policy definitions" value={data.coverage.policies} />
        <Metric label="Workflow procedures" value={data.coverage.procedures} />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-xl font-black">
              Ask Enorsis
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Answers are grounded in retrieved tenant evidence and
              remain subject to human approval controls.
            </p>
          </div>
        </div>

        <form
          action={askUnifiedProcurementAiAction}
          className="mt-5"
        >
          <textarea
            name="question"
            required
            minLength={10}
            maxLength={8000}
            rows={7}
            placeholder="Example: Which current contracts and policies should we consider before sourcing this category, and what approval risks should Procurement address?"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
            Ask grounded Procurement AI
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <div className="grid gap-5 md:grid-cols-3">
          <Feature
            icon={FileText}
            title="Tenant-grounded"
            text="Retrieves relevant contracts, supplier master records, policies and workflow procedures."
          />
          <Feature
            icon={ShieldCheck}
            title="Governed"
            text="Uses the existing governed AI execution, human review and audit trail."
          />
          <Feature
            icon={BrainCircuit}
            title="Evidence-aware"
            text="Retrieved source references are persisted with each AI execution."
          />
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase text-slate-500">
          Recent grounded conversations
        </p>
        <div className="mt-4 space-y-5">
          {data.executions.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-600">
                No grounded Procurement AI executions yet.
              </p>
            </div>
          ) : (
            data.executions.map((execution) => (
              <article key={execution.id} className={card}>
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="text-xs font-black uppercase text-blue-700">
                    {execution.status} · {execution.reviewStatus}
                  </p>
                  <p className="text-xs text-slate-500">
                    {execution.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {execution.outputText ??
                      execution.errorMessage ??
                      "Processing"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Confidence {execution.confidence ?? 0}%
                  </span>
                  <span>
                    Model {execution.model}
                  </span>
                  <span>
                    {execution.totalTokens ?? 0} tokens
                  </span>
                </div>
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

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BrainCircuit;
  title: string;
  text: string;
}) {
  return (
    <div>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}
