import Link from "next/link";
import {
  FileText,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import {
  supplierReplyConversationAction,
  supplierStartConversationAction,
  supplierSubmitInvoiceAction,
  supplierSubmitShipmentAction,
} from "@/modules/supplier-self-service/actions";
import { getSupplierSelfServiceWorkspace } from "@/modules/supplier-self-service/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierSelfServicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSupplierSelfServiceWorkspace(token);

  const invoiceAction =
    supplierSubmitInvoiceAction.bind(null, token);
  const shipmentAction =
    supplierSubmitShipmentAction.bind(null, token);
  const startConversationAction =
    supplierStartConversationAction.bind(null, token);
  const replyAction =
    supplierReplyConversationAction.bind(null, token);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-3xl bg-slate-950 p-8 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-300" />
            <p className="text-xs font-black uppercase tracking-[.22em] text-blue-200">
              Enorsis Supplier Network
            </p>
          </div>
          <h1 className="mt-4 text-4xl font-black">
            {data.supplier.tradingName ??
              data.supplier.legalName}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Supplier {data.supplier.supplierNumber} · Signed in as{" "}
            {data.portalUser.email}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href={`/supplier/portal/${token}/collaboration`}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900"
          >
            Documents & requests
          </Link>
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className={card}>
            <FileText className="h-5 w-5 text-blue-700" />
            <h2 className="mt-3 text-xl font-black">
              Submit invoice
            </h2>
            <form action={invoiceAction} className="mt-4 grid gap-3">
              <input className={input} name="invoiceNumber" placeholder="Invoice number" required />
              <input className={input} name="purchaseOrderRef" placeholder="Purchase order reference" />
              <div className="grid grid-cols-2 gap-3">
                <input className={input} name="currencyCode" defaultValue="USD" maxLength={3} />
                <input className={input} name="invoiceAmount" type="number" step="0.01" min="0" placeholder="Amount" required />
              </div>
              <input className={input} name="invoiceDate" type="date" required />
              <input className={input} name="dueDate" type="date" />
              <input className={input} name="attachmentRef" placeholder="Document reference" />
              <textarea className={`${input} min-h-20`} name="notes" placeholder="Notes" />
              <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                Submit invoice
              </button>
            </form>
          </div>

          <div className={card}>
            <PackageCheck className="h-5 w-5 text-blue-700" />
            <h2 className="mt-3 text-xl font-black">
              Update shipment
            </h2>
            <form action={shipmentAction} className="mt-4 grid gap-3">
              <input className={input} name="shipmentReference" placeholder="Shipment reference" required />
              <input className={input} name="purchaseOrderRef" placeholder="Purchase order reference" />
              <input className={input} name="trackingNumber" placeholder="Tracking number" />
              <input className={input} name="carrierName" placeholder="Carrier" />
              <select className={input} name="status" defaultValue="IN_TRANSIT">
                <option value="PLANNED">Planned</option>
                <option value="BOOKED">Booked</option>
                <option value="IN_TRANSIT">In transit</option>
                <option value="DELAYED">Delayed</option>
                <option value="DELIVERED">Delivered</option>
              </select>
              <input className={input} name="origin" placeholder="Origin" />
              <input className={input} name="destination" placeholder="Destination" />
              <input className={input} name="estimatedDeliveryAt" type="datetime-local" />
              <textarea className={`${input} min-h-20`} name="notes" placeholder="Shipment notes" />
              <button className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
                Submit shipment update
              </button>
            </form>
          </div>

          <div className={card}>
            <MessageSquareText className="h-5 w-5 text-blue-700" />
            <h2 className="mt-3 text-xl font-black">
              Contact your buyer
            </h2>
            <form action={startConversationAction} className="mt-4 grid gap-3">
              <input className={input} name="subject" placeholder="Subject" required />
              <select className={input} name="contextType">
                <option value="">General collaboration</option>
                <option value="PURCHASE_ORDER">Purchase order</option>
                <option value="INVOICE">Invoice</option>
                <option value="SHIPMENT">Shipment</option>
                <option value="CONTRACT">Contract</option>
                <option value="SOURCING">Sourcing</option>
                <option value="COMPLIANCE">Compliance</option>
              </select>
              <input className={input} name="contextReference" placeholder="Reference" />
              <select className={input} name="priority" defaultValue="NORMAL">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <textarea className={`${input} min-h-32`} name="body" placeholder="Message" required />
              <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                Send message
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className={card}>
            <h2 className="text-xl font-black">Assigned tasks</h2>
            <div className="mt-4 space-y-3">
              {data.tasks.map((task) => (
                <article key={task.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {task.description ?? "No description"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {task.status} · Due {task.dueAt?.toLocaleDateString() ?? "not set"}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="text-xl font-black">
              Onboarding & questionnaires
            </h2>
            <div className="mt-4 space-y-3">
              {data.questionnaires.map((item) => (
                <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.description ?? "No description"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.status} · Due {item.dueAt?.toLocaleDateString() ?? "not set"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase text-slate-500">
            Conversations
          </p>
          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            {data.threads.map((thread) => (
              <article key={thread.id} className={card}>
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {thread.priority} · {thread.status}
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      {thread.subject}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    {thread.lastMessageAt.toLocaleString()}
                  </span>
                </div>

                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {thread.messages.map((message) => (
                    <div key={message.id}>
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        {message.senderType} ·{" "}
                        {message.senderEmail ?? "Enorsis"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {message.body}
                      </p>
                    </div>
                  ))}
                </div>

                <form action={replyAction} className="mt-4 flex gap-2">
                  <input type="hidden" name="threadId" value={thread.id} />
                  <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" name="body" placeholder="Reply" required />
                  <button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                    Reply
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <HistoryTable
            title="Submitted invoices"
            rows={data.invoices.map((item) => ({
              id: item.id,
              primary: item.invoiceNumber,
              secondary: item.purchaseOrderRef ?? "No PO reference",
              status: item.status,
            }))}
          />
          <HistoryTable
            title="Shipment updates"
            rows={data.shipments.map((item) => ({
              id: item.id,
              primary: item.shipmentReference,
              secondary: item.trackingNumber ?? "No tracking number",
              status: item.status,
            }))}
          />
        </section>
      </div>
    </main>
  );
}

function HistoryTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    primary: string;
    secondary: string;
    status: string;
  }>;
}) {
  return (
    <div className={card}>
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-black">{row.primary}</p>
              <p className="mt-1 text-xs text-slate-500">{row.secondary}</p>
            </div>
            <span className="text-xs font-black text-slate-500">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
