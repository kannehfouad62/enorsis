import Link from "next/link";
import {
  FileText,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  ingestContractDocumentAction,
  ingestSupplierDocumentAction,
} from "@/modules/ai-rag/document-actions";
import { getDocumentIngestionWorkspace } from "@/modules/ai-rag/document-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function isExtractable(name: string) {
  const normalized = name.toLowerCase();
  return (
    normalized.endsWith(".pdf") ||
    normalized.endsWith(".docx")
  );
}

export default async function RagDocumentIngestionPage() {
  const data = await getDocumentIngestionWorkspace();

  const indexedSupplier = data.supplierDocuments.filter(
    (document) => document.ragSource?.status === "ACTIVE",
  ).length;
  const indexedContract = data.contractDocuments.filter(
    (document) => document.ragSource?.status === "ACTIVE",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B4.3 · Private Document Ingestion
          </p>
          <h1 className="mt-3 text-4xl font-black">
            RAG Document Ingestion
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Extract approved text from tenant-private supplier and
            contract documents, embed it into the Enterprise
            Knowledge index, and preserve source traceability.
          </p>
        </div>

        <Link
          href="/app/ai/knowledge"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Enterprise Knowledge
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          label="Supplier documents indexed"
          value={`${indexedSupplier}/${data.supplierDocuments.length}`}
        />
        <Metric
          label="Contract documents indexed"
          value={`${indexedContract}/${data.contractDocuments.length}`}
        />
        <Metric
          label="Supported extraction"
          value="PDF · DOCX"
        />
      </section>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Text-based PDF and DOCX documents are supported. Scanned
        PDFs, PNG and JPEG supplier documents require OCR and are
        intentionally not indexed automatically in this block.
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-xl font-black">
              Supplier document ingestion
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Files remain private in Vercel Blob; extraction happens
              server-side and only indexed text is stored in tenant
              knowledge chunks.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">RAG status</th>
                <th className="px-4 py-3">Chunks</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.supplierDocuments.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-3">
                    <p className="font-black">
                      {document.supplier.tradingName ||
                        document.supplier.legalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {document.supplier.supplierNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">{document.name}</td>
                  <td className="px-4 py-3">
                    {document.ragSource?.status ?? "NOT INDEXED"}
                  </td>
                  <td className="px-4 py-3">
                    {document.ragSource?._count.chunks ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {isExtractable(document.name) ? (
                      <form action={ingestSupplierDocumentAction}>
                        <input
                          type="hidden"
                          name="documentId"
                          value={document.id}
                        />
                        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                          {document.ragSource ? (
                            <RefreshCw className="h-3.5 w-3.5" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5" />
                          )}
                          {document.ragSource
                            ? "Re-index"
                            : "Index"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">
                        OCR required
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Contract document ingestion
          </h2>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">RAG status</th>
                <th className="px-4 py-3">Chunks</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.contractDocuments.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-3">
                    <p className="font-black">
                      {document.contract.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {document.contract.contractNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">{document.name}</td>
                  <td className="px-4 py-3">
                    {document.ragSource?.status ?? "NOT INDEXED"}
                  </td>
                  <td className="px-4 py-3">
                    {document.ragSource?._count.chunks ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <form action={ingestContractDocumentAction}>
                      <input
                        type="hidden"
                        name="documentId"
                        value={document.id}
                      />
                      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                        {document.ragSource ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        {document.ragSource
                          ? "Re-index"
                          : "Index"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  value: string;
}) {
  return (
    <div className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
