import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ListChecks,
  MessageSquareText,
  PackageCheck,
} from "lucide-react";

import {
  replySupplierConversationAction,
  startSupplierConversationAction,
  submitSupplierInvoiceAction,
  submitSupplierShipmentAction,
} from "@/modules/supplier-self-collaboration/actions";
import { getSupplierSelfCollaborationWorkspace } from "@/modules/supplier-self-collaboration/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierCollaborationPage() {
  const data =
    await getSupplierSelfCollaborationWorkspace();

  const supplier = data.supplier;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier collaboration
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Buyer Collaboration Workspace
          </h1>

          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Manage commercial activity, shipment updates,
            invoices and buyer conversations for{" "}
            {supplier.tradingName ?? supplier.legalName}.
          </p>
        </div>

        <Link
          href="/app/supplier-portal/collaboration/requests"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Documents & Requests
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Submitted invoices"
          value={data.metrics.submittedInvoices}
        />
        <Metric
          label="Active shipments"
          value={data.metrics.activeShipments}
        />
        <Metric
          label="Open conversations"
          value={data.metrics.openThreads}
        />
        <Metric
          label="Unread buyer messages"
          value={data.metrics.unreadBuyerMessages}
        />
        <Metric
          label="Open buyer requests"
          value={data.metrics.openActionRequests}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className={card}>
          <FileText className="h-6 w-6 text-blue-700" />

          <h2 className="mt-4 text-xl font-black">
            Submit invoice
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Submit your invoice details to the buyer for
            review and downstream payment processing.
          </p>

          <form
            action={submitSupplierInvoiceAction}
            className="mt-5 grid gap-3"
          >
            <input
              className={input}
              name="invoiceNumber"
              placeholder="Invoice number"
              required
            />

            <input
              className={input}
              name="purchaseOrderRef"
              placeholder="Purchase order reference"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className={input}
                name="currencyCode"
                defaultValue="USD"
                maxLength={3}
                required
              />

              <input
                className={input}
                name="invoiceAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount"
                required
              />
            </div>

            <label className="text-sm font-bold">
              Invoice date
              <input
                className={input}
                name="invoiceDate"
                type="date"
                required
              />
            </label>

            <label className="text-sm font-bold">
              Due date
              <input
                className={input}
                name="dueDate"
                type="date"
              />
            </label>

            <input
              className={input}
              name="attachmentRef"
              placeholder="Supporting document reference"
            />

            <textarea
              className={`${input} min-h-24`}
              name="notes"
              placeholder="Invoice notes"
            />

            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Submit invoice
            </button>
          </form>
        </div>

        <div className={card}>
          <PackageCheck className="h-6 w-6 text-blue-700" />

          <h2 className="mt-4 text-xl font-black">
            Shipment update
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create or update shipment information associated
            with a buyer purchase order.
          </p>

          <form
            action={submitSupplierShipmentAction}
            className="mt-5 grid gap-3"
          >
            <input
              className={input}
              name="shipmentReference"
              placeholder="Shipment reference"
              required
            />

            <input
              className={input}
              name="purchaseOrderRef"
              placeholder="Purchase order reference"
            />

            <input
              className={input}
              name="trackingNumber"
              placeholder="Tracking number"
            />

            <input
              className={input}
              name="carrierName"
              placeholder="Carrier"
            />

            <select
              className={input}
              name="status"
              defaultValue="PLANNED"
            >
              <option value="PLANNED">Planned</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">
                In transit
              </option>
              <option value="DELAYED">Delayed</option>
              <option value="DELIVERED">
                Delivered
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>

            <input
              className={input}
              name="origin"
              placeholder="Origin"
            />

            <input
              className={input}
              name="destination"
              placeholder="Destination"
            />

            <label className="text-sm font-bold">
              Estimated delivery
              <input
                className={input}
                name="estimatedDeliveryAt"
                type="datetime-local"
              />
            </label>

            <input
              className={input}
              name="proofOfDeliveryRef"
              placeholder="Proof of delivery reference"
            />

            <textarea
              className={`${input} min-h-24`}
              name="notes"
              placeholder="Shipment notes"
            />

            <button className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
              Save shipment update
            </button>
          </form>
        </div>

        <div className={card}>
          <MessageSquareText className="h-6 w-6 text-blue-700" />

          <h2 className="mt-4 text-xl font-black">
            Start buyer conversation
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start a governed conversation with your buyer
            about sourcing, orders, invoices, shipments,
            contracts or compliance.
          </p>

          <form
            action={startSupplierConversationAction}
            className="mt-5 grid gap-3"
          >
            <input
              className={input}
              name="subject"
              placeholder="Subject"
              required
            />

            <select
              className={input}
              name="contextType"
              defaultValue=""
            >
              <option value="">
                General collaboration
              </option>
              <option value="PURCHASE_ORDER">
                Purchase order
              </option>
              <option value="INVOICE">
                Invoice
              </option>
              <option value="SHIPMENT">
                Shipment
              </option>
              <option value="CONTRACT">
                Contract
              </option>
              <option value="SOURCING">
                Sourcing
              </option>
              <option value="COMPLIANCE">
                Compliance
              </option>
            </select>

            <input
              className={input}
              name="contextReference"
              placeholder="Context reference"
            />

            <select
              className={input}
              name="priority"
              defaultValue="NORMAL"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">
                Critical
              </option>
            </select>

            <input
              className={input}
              name="attachmentRef"
              placeholder="Attachment reference"
            />

            <textarea
              className={`${input} min-h-32`}
              name="body"
              placeholder="Message to buyer"
              required
            />

            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Start conversation
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Recent invoices
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Invoice
                </th>
                <th className="px-4 py-3">PO</th>
                <th className="px-4 py-3">
                  Amount
                </th>
                <th className="px-4 py-3">
                  Submitted
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.invoices.length > 0 ? (
                data.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-bold">
                      {invoice.invoiceNumber}
                    </td>

                    <td className="px-4 py-3">
                      {invoice.purchaseOrderRef ??
                        "—"}
                    </td>

                    <td className="px-4 py-3">
                      {invoice.currencyCode}{" "}
                      {Number(
                        invoice.invoiceAmount,
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {invoice.submittedAt.toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      {formatStatus(
                        invoice.status,
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-slate-500"
                    colSpan={5}
                  >
                    No invoices have been
                    submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Shipment activity
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Shipment
                </th>
                <th className="px-4 py-3">PO</th>
                <th className="px-4 py-3">
                  Tracking
                </th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.shipments.length > 0 ? (
                data.shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="px-4 py-3 font-bold">
                      {
                        shipment.shipmentReference
                      }
                    </td>

                    <td className="px-4 py-3">
                      {shipment.purchaseOrderRef ??
                        "—"}
                    </td>

                    <td className="px-4 py-3">
                      {shipment.trackingNumber ??
                        "—"}
                    </td>

                    <td className="px-4 py-3">
                      {shipment.estimatedDeliveryAt?.toLocaleString() ??
                        "—"}
                    </td>

                    <td className="px-4 py-3">
                      {formatStatus(
                        shipment.status,
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-slate-500"
                    colSpan={5}
                  >
                    No shipment activity has
                    been submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-6 w-6 text-blue-700" />
          <div>
            <h2 className="text-xl font-black">
              Buyer conversations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Persistent, auditable communication
              between your company and buyers.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.threads.length > 0 ? (
            data.threads.map((thread) => (
              <article
                key={thread.id}
                className={card}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {formatStatus(
                        thread.priority,
                      )}{" "}
                      ·{" "}
                      {formatStatus(
                        thread.status,
                      )}
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      {thread.subject}
                    </h3>

                    {thread.contextReference ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {thread.contextType
                          ? `${formatStatus(thread.contextType)} · `
                          : ""}
                        {
                          thread.contextReference
                        }
                      </p>
                    ) : null}
                  </div>

                  <span className="text-xs text-slate-500">
                    {thread.lastMessageAt.toLocaleString()}
                  </span>
                </div>

                <div className="mt-4 max-h-80 space-y-4 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {thread.messages.map(
                    (message) => (
                      <div key={message.id}>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          {message.senderType ===
                          "SUPPLIER"
                            ? "Your company"
                            : "Buyer"}
                          {message.senderEmail
                            ? ` · ${message.senderEmail}`
                            : ""}
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {message.body}
                        </p>

                        {message.attachmentRef ? (
                          <p className="mt-1 text-xs font-semibold text-blue-700">
                            Reference:{" "}
                            {
                              message.attachmentRef
                            }
                          </p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>

                <form
                  action={
                    replySupplierConversationAction
                  }
                  className="mt-4 grid gap-2"
                >
                  <input
                    type="hidden"
                    name="threadId"
                    value={thread.id}
                  />

                  <textarea
                    className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="body"
                    placeholder="Reply to buyer"
                    required
                  />

                  <div className="flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      name="attachmentRef"
                      placeholder="Optional document reference"
                    />

                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                      Reply
                    </button>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <div className={`${card} xl:col-span-2`}>
              <p className="text-sm font-semibold text-slate-500">
                No buyer conversations have
                started yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <ListChecks className="h-6 w-6 text-blue-700" />
            <h2 className="mt-3 text-xl font-black">
              Buyer requests requiring attention
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {data.metrics.openActionRequests} open
              request
              {data.metrics.openActionRequests === 1
                ? ""
                : "s"}{" "}
              currently require supplier attention.
            </p>
          </div>

          <Link
            href="/app/supplier-portal/collaboration/requests"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800"
          >
            Review requests
          </Link>
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
    <article className={card}>
      <p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value.toLocaleString()}
      </p>
    </article>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase(),
    )
    .join(" ");
}