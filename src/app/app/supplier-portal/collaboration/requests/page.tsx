import Link from "next/link";
import {
  FileUp,
  ListChecks,
} from "lucide-react";
import {
  createSupplierActionRequestAction,
  reviewSupplierActionRequestAction,
  shareSupplierDocumentAction,
} from "@/modules/supplier-collaboration-governance/actions";
import { getSupplierCollaborationRequestsWorkspace } from "@/modules/supplier-collaboration-governance/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierCollaborationRequestsPage() {
  const data = await getSupplierCollaborationRequestsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B6.3 · Collaboration Completion
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Shared Documents & Action Requests
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Exchange governed document references with suppliers,
            issue structured requests, receive supplier responses,
            and close or reopen requests with an auditable status.
          </p>
        </div>
        <Link
          href="/app/supplier-portal/collaboration"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Collaboration Operations
        </Link>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <FileUp className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">
            Share document with supplier
          </h2>
          <form action={shareSupplierDocumentAction} className="mt-4 grid gap-3">
            <SupplierSelect suppliers={data.suppliers} />
            <input className={input} name="title" placeholder="Document title" required />
            <input className={input} name="documentRef" placeholder="Document / private file reference" required />
            <input className={input} name="documentType" placeholder="Document type" />
            <input className={input} name="supplierEmail" type="email" placeholder="Supplier contact email" />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Description" />
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Share document
            </button>
          </form>
        </div>

        <div className={card}>
          <ListChecks className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">
            Create supplier action request
          </h2>
          <form action={createSupplierActionRequestAction} className="mt-4 grid gap-3">
            <SupplierSelect suppliers={data.suppliers} />
            <select className={input} name="requestType" defaultValue="GENERAL">
              <option value="GENERAL">General</option>
              <option value="DOCUMENT">Document</option>
              <option value="COMPLIANCE">Compliance</option>
              <option value="INVOICE">Invoice</option>
              <option value="SHIPMENT">Shipment</option>
              <option value="CONTRACT">Contract</option>
            </select>
            <input className={input} name="title" placeholder="Request title" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="What should the supplier do?" />
            <select className={input} name="priority" defaultValue="NORMAL">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input className={input} name="contextType" placeholder="Context type" />
            <input className={input} name="contextReference" placeholder="Context reference" />
            <input className={input} name="supplierEmail" type="email" placeholder="Supplier contact email" />
            <input className={input} name="dueAt" type="datetime-local" />
            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Send action request
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Supplier action requests</h2>
        <div className="mt-4 space-y-4">
          {data.requests.map((request) => (
            <article key={request.id} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">
                    {request.priority} · {request.status}
                  </p>
                  <h3 className="mt-1 font-black">{request.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {request.supplier?.tradingName ??
                      request.supplier?.legalName ??
                      request.supplierId}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Due {request.dueAt?.toLocaleString() ?? "not set"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {request.description ?? "No description"}
              </p>
              {request.responseText ? (
                <div className="mt-3 rounded-xl bg-white p-4 text-sm">
                  <p className="font-black">Supplier response</p>
                  <p className="mt-1 text-slate-600">{request.responseText}</p>
                  {request.responseDocumentRef ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Document: {request.responseDocumentRef}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <form action={reviewSupplierActionRequestAction} className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                <input type="hidden" name="requestId" value={request.id} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" name="reviewNotes" placeholder="Review notes" />
                <button name="decision" value="REVIEWED" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                  Mark reviewed
                </button>
                <button name="decision" value="COMPLETE" className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">
                  Complete
                </button>
                <button name="decision" value="REOPEN" className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white">
                  Reopen
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Shared document exchange</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-3">
                    {document.supplier?.tradingName ??
                      document.supplier?.legalName ??
                      document.supplierId}
                  </td>
                  <td className="px-4 py-3 font-bold">{document.title}</td>
                  <td className="px-4 py-3">{document.direction}</td>
                  <td className="px-4 py-3">{document.documentRef}</td>
                  <td className="px-4 py-3">{document.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SupplierSelect({
  suppliers,
}: {
  suppliers: Array<{
    id: string;
    supplierNumber: string;
    legalName: string;
    tradingName: string | null;
  }>;
}) {
  return (
    <select className={input} name="supplierId" required>
      <option value="">Select supplier</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.tradingName ?? supplier.legalName} · {supplier.supplierNumber}
        </option>
      ))}
    </select>
  );
}
