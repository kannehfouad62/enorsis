import Link from "next/link";
import {
  Bot,
  Boxes,
  Building2,
  FileText,
  PackageSearch,
  Sparkles,
} from "lucide-react";
import { askSpecializedAssistantAction } from "@/modules/ai-assistants/actions";
import { getSpecializedAssistantWorkspace } from "@/modules/ai-assistants/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const assistantIcons = {
  PROCUREMENT: Sparkles,
  SUPPLIER: Building2,
  INVENTORY: Boxes,
  CONTRACT: FileText,
  EXECUTIVE: Bot,
} as const;

export default async function SpecializedAssistantsPage() {
  const data = await getSpecializedAssistantWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B4.5 · Conversational Procurement AI
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Specialized Procurement Assistants
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Role-aware Procurement, Supplier, Inventory, Contract
            and Executive assistants grounded in Enterprise RAG
            and executed through Enorsis governed AI.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/ai/workspace"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Unified AI
          </Link>
          <Link
            href="/app/ai/knowledge"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Enterprise Knowledge
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          label="Available assistants"
          value={data.availableAssistants.length}
        />
        <Metric
          label="Active knowledge sources"
          value={data.knowledgeSources}
        />
        <Metric
          label="Semantic chunks"
          value={data.knowledgeChunks}
        />
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {data.availableAssistants.map((assistant) => {
          const Icon = assistantIcons[assistant.key];

          return (
            <article key={assistant.key} className={card}>
              <Icon className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black">
                {assistant.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {assistant.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <PackageSearch className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-xl font-black">
              Ask a specialized assistant
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the domain best suited to the decision or
              question. Enorsis will retrieve tenant evidence and
              preserve the response in governed AI history.
            </p>
          </div>
        </div>

        <form
          action={askSpecializedAssistantAction}
          className="mt-5"
        >
          <label className="block">
            <span className="text-sm font-black">
              Assistant
            </span>
            <select
              name="assistant"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {data.availableAssistants.map((assistant) => (
                <option
                  key={assistant.key}
                  value={assistant.key}
                >
                  {assistant.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-black">
              Question
            </span>
            <textarea
              name="question"
              required
              minLength={10}
              maxLength={8000}
              rows={7}
              placeholder="Ask a procurement, supplier, inventory, contract or executive question."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <button className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
            Ask governed assistant
          </button>
        </form>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase text-slate-500">
          Recent assistant conversations
        </p>
        <div className="mt-4 space-y-5">
          {data.executions.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-600">
                No specialized assistant executions yet.
              </p>
            </div>
          ) : (
            data.executions.map((execution) => (
              <article key={execution.id} className={card}>
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="text-xs font-black uppercase text-blue-700">
                    {execution.resourceType?.replace(
                      "ProcurementAssistant:",
                      "",
                    )}{" "}
                    · {execution.status} · {execution.reviewStatus}
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
                  <span>{execution.model}</span>
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
