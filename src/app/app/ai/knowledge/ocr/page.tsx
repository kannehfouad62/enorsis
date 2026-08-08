import Link from "next/link";
import {
  Eye,
  FileImage,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  ocrContractDocumentAction,
  ocrSupplierDocumentAction,
} from "@/modules/ai-rag/ocr-actions";
import { getOcrWorkspace } from "@/modules/ai-rag/ocr-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function supportsOcr(name: string) {
  const value = name.toLowerCase();
  return (
    value.endsWith(".pdf") ||
    value.endsWith(".png") ||
    value.endsWith(".jpg") ||
    value.endsWith(".jpeg")
  );
}

export default async function GovernedOcrPage() {
  const data = await getOcrWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B4.4 · Governed OCR
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Governed OCR Ingestion
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Extract text from scanned PDFs and image-based supplier
            documents through the existing OpenAI governance boundary,
            then index the approved extraction into Enterprise RAG.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/app/ai/knowledge/documents"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Document Ingestion
          </Link>
          <Link
            href="/app/ai/knowledge"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Knowledge Catalog
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        OCR is explicit rather than automatic. Run it only for
        scanned/image documents that cannot be reliably extracted
        through the normal PDF/DOCX ingestion path.
      </div>

      <DocumentTable
        title="Supplier OCR"
        kind="SUPPLIER"
        documents={data.supplierDocuments}
      />

      <DocumentTable
        title="Contract OCR"
        kind="CONTRACT"
        documents={data.contractDocuments}
      />
    </div>
  );
}

function DocumentTable({
  title,
  kind,
  documents,
}: {
  title: string;
  kind: "SUPPLIER" | "CONTRACT";
  documents: Array<{
    id: string;
    name: string;
    supplier?: {
      supplierNumber: string;
      legalName: string;
      tradingName: string | null;
    };
    contract?: {
      contractNumber: string;
      title: string;
    };
    ragSource: {
      status: string;
      metadata: unknown;
      _count: { chunks: number };
    } | null;
  }>;
}) {
  return (
    <section className={`${card} mt-8`}>
      <div className="flex items-center gap-3">
        {kind === "SUPPLIER" ? (
          <FileImage className="h-5 w-5 text-blue-700" />
        ) : (
          <FileText className="h-5 w-5 text-blue-700" />
        )}
        <h2 className="text-xl font-black">{title}</h2>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Index status</th>
              <th className="px-4 py-3">Chunks</th>
              <th className="px-4 py-3">OCR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => {
              const action =
                kind === "SUPPLIER"
                  ? ocrSupplierDocumentAction
                  : ocrContractDocumentAction;

              return (
                <tr key={document.id}>
                  <td className="px-4 py-3">
                    {document.supplier ? (
                      <>
                        <p className="font-black">
                          {document.supplier.tradingName ||
                            document.supplier.legalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {document.supplier.supplierNumber}
                        </p>
                      </>
                    ) : document.contract ? (
                      <>
                        <p className="font-black">
                          {document.contract.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {document.contract.contractNumber}
                        </p>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{document.name}</td>
                  <td className="px-4 py-3">
                    {document.ragSource?.status ?? "NOT INDEXED"}
                  </td>
                  <td className="px-4 py-3">
                    {document.ragSource?._count.chunks ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {supportsOcr(document.name) ? (
                      <form action={action}>
                        <input
                          type="hidden"
                          name="documentId"
                          value={document.id}
                        />
                        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                          {document.ragSource ? (
                            <RefreshCw className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          Run OCR
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Not applicable
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
