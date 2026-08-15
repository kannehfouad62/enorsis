import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  UploadCloud,
} from "lucide-react";

import { uploadSupplierQualificationDocumentAction } from "@/modules/supplier-portal/document-actions";
import { getSupplierPortalWorkspace } from "@/modules/supplier-portal/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierQualificationDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const { uploaded } = await searchParams;
  const data = await getSupplierPortalWorkspace();
  const supplier = data.supplier;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier qualification evidence
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Qualification Documents
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Upload reusable tax, insurance, certification, licensing,
            ESG, financial and other qualification evidence for
            {` ${supplier.tradingName ?? supplier.legalName}`}.
          </p>
        </div>
        <Link
          href="/app/supplier-portal"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to qualifications
        </Link>
      </div>

      {uploaded === "1" ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">Document uploaded successfully</p>
            <p className="mt-1 text-sm">
              The document is now pending verification and is attached to your supplier profile.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className={card}>
          <UploadCloud className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">
            Upload qualification evidence
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Files remain private. Supported formats are PDF, PNG, JPEG and
            DOCX, up to 4 MB.
          </p>

          <form
            action={uploadSupplierQualificationDocumentAction}
            className="mt-5 grid gap-4"
          >
            <label className="text-sm font-bold">
              Document type
              <select
                className={input}
                name="type"
                defaultValue="CERTIFICATION"
              >
                <option value="TAX">Tax</option>
                <option value="INSURANCE">Insurance</option>
                <option value="CERTIFICATION">Certification</option>
                <option value="LICENSE">License</option>
                <option value="ESG">ESG</option>
                <option value="FINANCIAL">Financial</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              Issued date
              <input className={input} name="issuedAt" type="date" />
            </label>

            <label className="text-sm font-bold">
              Expiry date
              <input className={input} name="expiresAt" type="date" />
            </label>

            <label className="text-sm font-bold">
              Private file
              <input
                className={input}
                name="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                required
              />
            </label>

            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Upload qualification document
            </button>
          </form>
        </section>

        <section className={card}>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-6 w-6 text-blue-700" />
            <div>
              <h2 className="text-xl font-black">Attached documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Verification is performed independently; suppliers cannot verify their own evidence.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {supplier.documents.length > 0 ? (
              supplier.documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">
                        {formatStatus(document.type)}
                      </p>
                      <h3 className="mt-1 font-black">{document.name}</h3>
                      <p className="mt-2 text-xs text-slate-500">
                        Issued: {document.issuedAt?.toLocaleDateString() ?? "Not specified"}
                        {" · "}
                        Expires: {document.expiresAt?.toLocaleDateString() ?? "No expiry"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                      {formatStatus(document.status)}
                    </span>
                  </div>

                  {document.rejectionReason ? (
                    <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                      Review note: {document.rejectionReason}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-amber-50 px-4 py-5 text-sm font-semibold text-amber-800">
                No qualification documents have been uploaded yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
