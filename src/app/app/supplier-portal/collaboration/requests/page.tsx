import Link from "next/link";
import {
  ArrowLeft,
  FileUp,
  Inbox,
  ListChecks,
} from "lucide-react";

import {
  acknowledgeSupplierSharedDocumentAction,
  respondSupplierActionRequestAction,
  shareSupplierDocumentToBuyerAction,
} from "@/modules/supplier-self-collaboration/actions";
import { getSupplierSelfCollaborationWorkspace } from "@/modules/supplier-self-collaboration/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierCollaborationRequestsPage() {
  const data =
    await getSupplierSelfCollaborationWorkspace();

  const supplierDocuments =
    data.sharedDocuments.filter(
      (document) =>
        document.direction ===
        "SUPPLIER_TO_BUYER",
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Buyer requests & document exchange
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Documents & Action Requests
          </h1>

          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Review buyer-issued requests, provide
            governed responses, acknowledge received
            documents and exchange supporting document
            references.
          </p>
        </div>

        <Link
          href="/app/supplier-portal/collaboration"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Collaboration workspace
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          label="Open buyer requests"
          value={data.metrics.openActionRequests}
        />

        <Metric
          label="Documents awaiting acknowledgement"
          value={
            data.metrics
              .unacknowledgedBuyerDocuments
          }
        />

        <Metric
          label="Documents shared with buyer"
          value={supplierDocuments.length}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className={card}>
          <ListChecks className="h-6 w-6 text-blue-700" />

          <h2 className="mt-4 text-xl font-black">
            Buyer action requests
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            These requests were issued by buyers to your
            organization. You can respond, but buyer-side
            review and closure remain independently
            controlled.
          </p>

          <div className="mt-6 space-y-5">
            {data.actionRequests.length > 0 ? (
              data.actionRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        {formatStatus(
                          request.requestType,
                        )}{" "}
                        ·{" "}
                        {formatStatus(
                          request.priority,
                        )}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {request.title}
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {request.description ??
                          "No description provided."}
                      </p>
                    </div>

                    <StatusBadge
                      value={request.status}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                    <p>
                      Requested:{" "}
                      {request.requestedAt.toLocaleString()}
                    </p>

                    <p>
                      Due:{" "}
                      {request.dueAt?.toLocaleString() ??
                        "Not specified"}
                    </p>

                    {request.contextReference ? (
                      <p className="sm:col-span-2">
                        Context:{" "}
                        {request.contextType
                          ? `${formatStatus(request.contextType)} · `
                          : ""}
                        {
                          request.contextReference
                        }
                      </p>
                    ) : null}
                  </div>

                  {request.responseText ||
                  request.responseDocumentRef ? (
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Current supplier response
                      </p>

                      {request.responseText ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {
                            request.responseText
                          }
                        </p>
                      ) : null}

                      {request.responseDocumentRef ? (
                        <p className="mt-2 text-sm font-semibold text-blue-700">
                          Supporting reference:{" "}
                          {
                            request.responseDocumentRef
                          }
                        </p>
                      ) : null}

                      {request.respondedAt ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Responded{" "}
                          {request.respondedAt.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {request.reviewNotes ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                        Buyer review note
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-900">
                        {request.reviewNotes}
                      </p>
                    </div>
                  ) : null}

                  {![
                    "COMPLETED",
                    "CANCELLED",
                    "CLOSED",
                  ].includes(request.status) ? (
                    <form
                      action={
                        respondSupplierActionRequestAction
                      }
                      className="mt-5 grid gap-3"
                    >
                      <input
                        type="hidden"
                        name="requestId"
                        value={request.id}
                      />

                      <textarea
                        className={`${input} min-h-28`}
                        name="responseText"
                        defaultValue={
                          request.responseText ?? ""
                        }
                        placeholder="Describe your response to this buyer request"
                      />

                      <input
                        className={input}
                        name="responseDocumentRef"
                        defaultValue={
                          request.responseDocumentRef ??
                          ""
                        }
                        placeholder="Supporting document reference"
                      />

                      <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                        Submit response to buyer
                      </button>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-emerald-700">
                      This request is closed and no longer
                      accepts supplier responses.
                    </p>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
                No buyer action requests have been
                issued to your company.
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <FileUp className="h-6 w-6 text-blue-700" />

          <h2 className="mt-4 text-xl font-black">
            Share document reference
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Share a governed document reference with the
            buyer. Qualification evidence should continue
            to use the dedicated Qualification Documents
            workspace.
          </p>

          <form
            action={
              shareSupplierDocumentToBuyerAction
            }
            className="mt-5 grid gap-3"
          >
            <input
              className={input}
              name="title"
              placeholder="Document title"
              required
            />

            <input
              className={input}
              name="documentType"
              placeholder="Document type"
            />

            <input
              className={input}
              name="documentRef"
              placeholder="Private file / document reference"
              required
            />

            <textarea
              className={`${input} min-h-24`}
              name="description"
              placeholder="Description"
            />

            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Share with buyer
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-blue-700" />

          <div>
            <h2 className="text-xl font-black">
              Documents received from buyers
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Acknowledge buyer-issued documents without
              modifying the original governed record.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {data.buyerDocuments.length > 0 ? (
            data.buyerDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                      {document.documentType
                        ? formatStatus(
                            document.documentType,
                          )
                        : "Shared document"}
                    </p>

                    <h3 className="mt-1 font-black">
                      {document.title}
                    </h3>

                    {document.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {document.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs text-slate-500">
                      Reference:{" "}
                      {document.documentRef}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Shared{" "}
                      {document.sharedAt.toLocaleString()}
                    </p>
                  </div>

                  <StatusBadge
                    value={document.status}
                  />
                </div>

                {document.acknowledgedAt ? (
                  <p className="mt-4 text-sm font-semibold text-emerald-700">
                    Acknowledged{" "}
                    {document.acknowledgedAt.toLocaleString()}
                    {document.acknowledgedBy
                      ? ` by ${document.acknowledgedBy}`
                      : ""}
                  </p>
                ) : (
                  <form
                    action={
                      acknowledgeSupplierSharedDocumentAction
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="documentId"
                      value={document.id}
                    />

                    <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                      Acknowledge receipt
                    </button>
                  </form>
                )}
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
              No documents have been shared with your
              company by buyers.
            </div>
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Documents shared with buyers
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Document
                </th>
                <th className="px-4 py-3">
                  Type
                </th>
                <th className="px-4 py-3">
                  Reference
                </th>
                <th className="px-4 py-3">
                  Shared
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {supplierDocuments.length > 0 ? (
                supplierDocuments.map(
                  (document) => (
                    <tr key={document.id}>
                      <td className="px-4 py-3 font-bold">
                        {document.title}
                      </td>

                      <td className="px-4 py-3">
                        {document.documentType
                          ? formatStatus(
                              document.documentType,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {document.documentRef}
                      </td>

                      <td className="px-4 py-3">
                        {document.sharedAt.toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        {formatStatus(
                          document.status,
                        )}
                      </td>
                    </tr>
                  ),
                )
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Your company has not shared any
                    collaboration documents yet.
                  </td>
                </tr>
              )}
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

function StatusBadge({
  value,
}: {
  value: string;
}) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
      {formatStatus(value)}
    </span>
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