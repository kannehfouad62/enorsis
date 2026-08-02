import Link from "next/link";
import {
  cancelPurchaseRequestAction,
  decidePurchaseRequestAction,
} from "@/modules/purchase-requests/actions";
import { getPurchaseRequestDetail } from "@/modules/purchase-requests/queries";

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, request } = await getPurchaseRequestDetail(id);
  const pending = request.approvals.find((item) => item.decision === "PENDING");
  const canDecide =
    pending &&
    (pending.approverId === session.user.id ||
      session.user.roles.some((role) => ["TENANT_ADMIN", "TENANT_OWNER"].includes(role)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <Link className="text-sm font-black text-blue-700" href="/app/requests">← Purchase requests</Link>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">{request.requestNumber}</p>
            <h1 className="mt-2 text-3xl font-black">{request.title}</h1>
            <p className="mt-2 text-sm text-slate-500">Revision {request.revision} · {request.requester.name ?? request.requester.email}</p>
          </div>
          <span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{request.status.replaceAll("_", " ")}</span>
        </div>

        <p className="mt-6 leading-7 text-slate-600">{request.businessJustification}</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">Line</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Unit price</th><th className="p-3">Total</th></tr></thead>
            <tbody>{request.lines.map((line) => <tr key={line.id} className="border-t border-slate-100"><td className="p-3">{line.lineNumber}</td><td className="p-3 font-semibold">{line.description}</td><td className="p-3">{line.quantity.toString()} {line.unitOfMeasure}</td><td className="p-3">{request.originalCurrency} {line.unitPrice.toString()}</td><td className="p-3 font-black">{request.originalCurrency} {line.lineTotal.toString()}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {request.approvals.map((approval) => (
            <div key={approval.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Approval step {approval.sequence}</p>
              <p className="mt-2 font-black">{approval.approver.name ?? approval.approver.email}</p>
              <p className="mt-1 text-sm text-slate-600">{approval.decision}</p>
              {approval.comments ? <p className="mt-2 text-sm">{approval.comments}</p> : null}
            </div>
          ))}
        </div>

        {canDecide ? (
          <form action={decidePurchaseRequestAction} className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <input type="hidden" name="purchaseRequestId" value={request.id} />
            <textarea className="w-full rounded-xl border border-blue-200 bg-white p-3" name="comments" placeholder="Decision comments" />
            <div className="mt-3 flex gap-3">
              <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="APPROVED">Approve</button>
              <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white" name="decision" value="RETURNED">Return</button>
              <button className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="REJECTED">Reject</button>
            </div>
          </form>
        ) : null}

        {!["APPROVED", "CANCELLED"].includes(request.status) &&
        (request.requesterId === session.user.id ||
          session.user.roles.some((role) => ["PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"].includes(role))) ? (
          <form action={cancelPurchaseRequestAction} className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <input type="hidden" name="purchaseRequestId" value={request.id} />
            <input className="min-w-64 flex-1 rounded-xl border border-red-200 bg-white px-4 py-3" name="cancellationReason" placeholder="Cancellation reason" required />
            <button className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white">Cancel request</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
