import Link from "next/link";
import {
  FileUp,
  ListChecks,
} from "lucide-react";
import {
  supplierAcknowledgeDocumentAction,
  supplierRespondActionRequestAction,
  supplierShareDocumentAction,
} from "@/modules/supplier-self-service/collaboration-actions";
import { getSupplierExternalCollaborationWorkspace } from "@/modules/supplier-self-service/collaboration-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierExternalCollaborationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSupplierExternalCollaborationWorkspace(token);

  const shareAction = supplierShareDocumentAction.bind(null, token);
  const acknowledgeAction =
    supplierAcknowledgeDocumentAction.bind(null, token);
  const respondAction =
    supplierRespondActionRequestAction.bind(null, token);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
              Enorsis Supplier Network
            </p>
            <h1 className="mt-3 text-4xl font-black">
              Documents & Action Requests
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {data.supplier.tradingName ?? data.supplier.legalName} ·{" "}
              {data.portalUser.email}
            </p>
          </div>
          <Link
            href={`/supplier/portal/${token}`}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Supplier Home
          </Link>
        </div>

        <section className={`${card} mt-8`}>
          <FileUp className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">
            Share document with buyer
          </h2>
          <form action={shareAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input className={input} name="title" placeholder="Document title" required />
            <input className={input} name="documentType" placeholder="Document type" />
            <input className={`${input} md:col-span-2`} name="documentRef" placeholder="Document / file reference" required />
            <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Description" />
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white md:col-span-2">
              Share document
            </button>
          </form>
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase text-slate-500">
            Action requests
          </p>
          <div className="mt-4 space-y-4">
            {data.requests.map((request) => (
              <article key={request.id} className={card}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {request.priority} · {request.status}
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      {request.title}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    Due {request.dueAt?.toLocaleString() ?? "not set"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {request.description ?? "No description"}
                </p>
                <form action={respondAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <textarea
                    className={`${input} min-h-24`}
                    name="responseText"
                    defaultValue={request.responseText ?? ""}
                    placeholder="Your response"
                    required
                  />
                  <input
                    className={input}
                    name="responseDocumentRef"
                    defaultValue={request.responseDocumentRef ?? ""}
                    placeholder="Supporting document reference"
                  />
                  <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                    Submit response
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase text-slate-500">
            Shared documents
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.documents.map((document) => (
              <article key={document.id} className={card}>
                <p className="text-xs font-black uppercase text-blue-700">
                  {document.direction} · {document.status}
                </p>
                <h2 className="mt-2 text-lg font-black">
                  {document.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {document.description ?? "No description"}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Reference: {document.documentRef}
                </p>
                {document.direction === "BUYER_TO_SUPPLIER" &&
                document.status !== "ACKNOWLEDGED" ? (
                  <form action={acknowledgeAction} className="mt-4">
                    <input type="hidden" name="documentId" value={document.id} />
                    <button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">
                      Acknowledge document
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
