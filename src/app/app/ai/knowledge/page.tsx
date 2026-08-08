import Link from "next/link";
import {
  Database,
  FileSearch,
  LibraryBig,
  ShieldCheck,
} from "lucide-react";
import {
  askSemanticKnowledgeAction,
  createKnowledgeSourceAction,
  setKnowledgeSourceStatusAction,
} from "@/modules/ai-rag/knowledge-actions";
import { getEnterpriseKnowledgeWorkspace } from "@/modules/ai-rag/knowledge-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function EnterpriseKnowledgePage() {
  const data = await getEnterpriseKnowledgeWorkspace();

  const active = data.sources.filter(
    (source) => source.status === "ACTIVE",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B4.2 · Enterprise RAG
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise Knowledge & Semantic Retrieval
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Govern company knowledge, procurement procedures,
            policy guidance, contract knowledge and supplier
            evidence as tenant-isolated semantic sources for
            Enorsis AI.
          </p>
        </div>

        <Link
          href="/app/ai/workspace"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Unified Procurement AI
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          icon={LibraryBig}
          label="Knowledge sources"
          value={data.sources.length}
        />
        <Metric
          icon={ShieldCheck}
          label="Active sources"
          value={active}
        />
        <Metric
          icon={Database}
          label="Semantic chunks"
          value={data.chunkCount}
        />
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Add governed knowledge source
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Paste approved source text and optionally reference the
          originating private document, contract, supplier file or
          internal procedure.
        </p>

        <form
          action={createKnowledgeSourceAction}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label>
            <span className="text-sm font-bold">Source type</span>
            <select className={input} name="sourceType">
              <option value="COMPANY_KNOWLEDGE">
                Company knowledge
              </option>
              <option value="PROCUREMENT_POLICY">
                Procurement policy
              </option>
              <option value="CONTRACT_DOCUMENT">
                Contract document
              </option>
              <option value="SUPPLIER_DOCUMENT">
                Supplier document
              </option>
              <option value="INTERNAL_PROCEDURE">
                Internal procedure
              </option>
            </select>
          </label>
          <Field name="title" label="Title" required />
          <Field
            name="externalReference"
            label="Document / record reference"
          />
          <Field
            name="description"
            label="Description"
          />

          <label className="md:col-span-2">
            <span className="text-sm font-bold">
              Approved source text
            </span>
            <textarea
              className={`${input} min-h-72`}
              name="content"
              minLength={50}
              maxLength={250000}
              required
              placeholder="Paste the authoritative company, policy, contract, supplier or procedure text to index."
            />
          </label>

          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white md:col-span-2">
            Index knowledge source
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <FileSearch className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-xl font-black">
              Test semantic retrieval
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Runs against active embedded knowledge sources and
              records the grounded response in AI execution history.
            </p>
          </div>
        </div>

        <form action={askSemanticKnowledgeAction} className="mt-5">
          <textarea
            name="question"
            minLength={10}
            maxLength={8000}
            rows={5}
            required
            placeholder="Ask a question about company policy, procurement procedures, contracts or supplier evidence."
            className={`${input} min-h-36`}
          />
          <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Run semantic RAG query
          </button>
        </form>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase text-slate-500">
          Knowledge catalog
        </p>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          {data.sources.map((source) => (
            <article key={source.id} className={card}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">
                    {source.sourceType.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    {source.title}
                  </h2>
                </div>
                <span className="text-xs font-black text-slate-500">
                  {source.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {source.description ?? "No description"}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {source._count.chunks} chunks ·{" "}
                {source.externalReference ?? "No external reference"}
              </p>

              <form
                action={setKnowledgeSourceStatusAction}
                className="mt-4"
              >
                <input
                  type="hidden"
                  name="sourceId"
                  value={source.id}
                />
                <input
                  type="hidden"
                  name="status"
                  value={
                    source.status === "ACTIVE"
                      ? "DISABLED"
                      : "ACTIVE"
                  }
                />
                <button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">
                  {source.status === "ACTIVE"
                    ? "Disable retrieval"
                    : "Enable retrieval"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase text-slate-500">
          Recent semantic AI executions
        </p>
        <div className="mt-4 space-y-4">
          {data.executions.map((execution) => (
            <article key={execution.id} className={card}>
              <div className="flex flex-wrap justify-between gap-3">
                <p className="text-xs font-black uppercase text-blue-700">
                  {execution.status} · {execution.reviewStatus}
                </p>
                <p className="text-xs text-slate-500">
                  {execution.createdAt.toLocaleString()}
                </p>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {execution.outputText ??
                  execution.errorMessage ??
                  "Processing"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: number;
}) {
  return (
    <div className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  required = false,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input
        className={input}
        name={name}
        required={required}
      />
    </label>
  );
}
