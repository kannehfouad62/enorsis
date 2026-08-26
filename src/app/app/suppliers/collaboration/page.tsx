import Link from "next/link";
import { FileText, MessageSquareText, PackageCheck } from "lucide-react";

import {
  createSupplierConversationAction,
  recordSupplierInvoiceAction,
  recordSupplierShipmentAction,
  replySupplierConversationAction,
} from "@/modules/supplier-collaboration/actions";
import { getSupplierCollaborationWorkspace } from "@/modules/supplier-collaboration/queries";

const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function BuyerSupplierCollaborationPage() {
  const data = await getSupplierCollaborationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Buyer supplier operations</p>
          <h1 className="mt-3 text-4xl font-black">Supplier Collaboration Operations</h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Manage supplier invoice submissions, shipment updates and governed buyer-supplier conversations across your supplier network.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/suppliers/collaboration/requests" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Documents & Requests
          </Link>
          <Link href="/app/suppliers" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800">
            Supplier Intelligence
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Submitted invoices" value={data.metrics.submittedInvoices} />
        <Metric label="Active shipment updates" value={data.metrics.activeShipments} />
        <Metric label="Open conversations" value={data.metrics.openThreads} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className={card}>
          <FileText className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">Record supplier invoice</h2>
          <form action={recordSupplierInvoiceAction} className="mt-4 grid gap-3">
            <SupplierSelect suppliers={data.suppliers} />
            <input className={input} name="invoiceNumber" placeholder="Invoice number" required />
            <input className={input} name="purchaseOrderRef" placeholder="PO reference" />
            <div className="grid grid-cols-2 gap-3">
              <input className={input} name="currencyCode" defaultValue="USD" maxLength={3} />
              <input className={input} name="invoiceAmount" type="number" step="0.01" min="0" placeholder="Amount" required />
            </div>
            <input className={input} name="invoiceDate" type="date" required />
            <input className={input} name="dueDate" type="date" />
            <input className={input} name="supplierEmail" type="email" placeholder="Supplier contact email" />
            <input className={input} name="attachmentRef" placeholder="Attachment/document reference" />
            <textarea className={`${input} min-h-20`} name="notes" placeholder="Notes" />
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">Record invoice submission</button>
          </form>
        </div>

        <div className={card}>
          <PackageCheck className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">Record shipment update</h2>
          <form action={recordSupplierShipmentAction} className="mt-4 grid gap-3">
            <SupplierSelect suppliers={data.suppliers} />
            <input className={input} name="shipmentReference" placeholder="Shipment reference" required />
            <input className={input} name="purchaseOrderRef" placeholder="PO reference" />
            <input className={input} name="trackingNumber" placeholder="Tracking number" />
            <input className={input} name="carrierName" placeholder="Carrier" />
            <select className={input} name="status" defaultValue="PLANNED">
              <option value="PLANNED">Planned</option><option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">In transit</option><option value="DELAYED">Delayed</option>
              <option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option>
            </select>
            <input className={input} name="origin" placeholder="Origin" />
            <input className={input} name="destination" placeholder="Destination" />
            <input className={input} name="estimatedDeliveryAt" type="datetime-local" />
            <input className={input} name="supplierEmail" type="email" placeholder="Supplier contact email" />
            <textarea className={`${input} min-h-20`} name="notes" placeholder="Shipment notes" />
            <button className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">Record shipment update</button>
          </form>
        </div>

        <div className={card}>
          <MessageSquareText className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">Start supplier conversation</h2>
          <form action={createSupplierConversationAction} className="mt-4 grid gap-3">
            <SupplierSelect suppliers={data.suppliers} />
            <input className={input} name="subject" placeholder="Subject" required />
            <select className={input} name="contextType" defaultValue="">
              <option value="">General collaboration</option><option value="PURCHASE_ORDER">Purchase order</option>
              <option value="INVOICE">Invoice</option><option value="SHIPMENT">Shipment</option>
              <option value="CONTRACT">Contract</option><option value="SOURCING">Sourcing</option><option value="COMPLIANCE">Compliance</option>
            </select>
            <input className={input} name="contextReference" placeholder="Context reference" />
            <select className={input} name="priority" defaultValue="NORMAL">
              <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
            </select>
            <input className={input} name="supplierEmail" type="email" placeholder="Supplier contact email" />
            <textarea className={`${input} min-h-32`} name="body" placeholder="Initial message" required />
            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Start conversation</button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Recent supplier invoices</h2>
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">PO</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.invoices.map((invoice) => <tr key={invoice.id}>
              <td className="px-4 py-3">{invoice.supplier?.tradingName ?? invoice.supplier?.legalName ?? invoice.supplierId}</td>
              <td className="px-4 py-3 font-bold">{invoice.invoiceNumber}</td><td className="px-4 py-3">{invoice.purchaseOrderRef ?? "—"}</td>
              <td className="px-4 py-3">{invoice.currencyCode} {Number(invoice.invoiceAmount).toLocaleString()}</td><td className="px-4 py-3">{formatStatus(invoice.status)}</td>
            </tr>)}
          </tbody>
        </table></div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Recent shipment updates</h2>
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Shipment</th><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">ETA</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.shipments.map((shipment) => <tr key={shipment.id}>
              <td className="px-4 py-3">{shipment.supplier?.tradingName ?? shipment.supplier?.legalName ?? shipment.supplierId}</td><td className="px-4 py-3 font-bold">{shipment.shipmentReference}</td>
              <td className="px-4 py-3">{shipment.trackingNumber ?? "—"}</td><td className="px-4 py-3">{shipment.estimatedDeliveryAt?.toLocaleString() ?? "—"}</td><td className="px-4 py-3">{formatStatus(shipment.status)}</td>
            </tr>)}
          </tbody>
        </table></div>
      </section>

      <section className="mt-8">
        <p className="text-xs font-black uppercase text-slate-500">Buyer-supplier conversations</p>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          {data.threads.map((thread) => <article key={thread.id} className={card}>
            <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase text-blue-700">{formatStatus(thread.priority)} · {formatStatus(thread.status)}</p><h2 className="mt-1 text-lg font-black">{thread.subject}</h2><p className="mt-1 text-xs text-slate-500">{thread.supplier?.tradingName ?? thread.supplier?.legalName ?? thread.supplierId}</p></div><span className="text-xs text-slate-500">{thread.lastMessageAt.toLocaleString()}</span></div>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">{thread.messages.map((message) => <div key={message.id}><p className="text-[11px] font-black uppercase text-slate-500">{message.senderType} · {message.senderEmail ?? "Enorsis"}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p></div>)}</div>
            <form action={replySupplierConversationAction} className="mt-4 flex gap-2"><input type="hidden" name="threadId" value={thread.id} /><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" name="body" placeholder="Reply to supplier" required /><button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Reply</button></form>
          </article>)}
        </div>
      </section>
    </div>
  );
}

function SupplierSelect({ suppliers }: { suppliers: Array<{ id: string; supplierNumber: string; legalName: string; tradingName: string | null }> }) {
  return <select className={input} name="supplierId" required><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradingName ?? supplier.legalName} · {supplier.supplierNumber}</option>)}</select>;
}
function Metric({ label, value }: { label: string; value: number }) { return <article className={card}><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>; }
function formatStatus(value: string) { return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" "); }
