import {
  authorizePaymentRunAction,
  createDraftPaymentRunAction,
  executePaymentRunAction,
  submitPaymentRunForApprovalAction,
} from "@/modules/payment-operations/actions";
import { getPaymentOperationsWorkspace } from "@/modules/payment-operations/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const secondary =
  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50";

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function PaymentOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; message?: string; error?: string }>;
}) {
  const data = await getPaymentOperationsWorkspace();
  const params = await searchParams;

  const canAuthorizePaymentRun =
    data.currentUserRoles.some((role) =>
      ["TENANT_OWNER", "TENANT_ADMIN", "FINANCE"].includes(
        role,
      ),
    );

  const canExecutePaymentRun =
    data.currentUserRoles.some((role) =>
      [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ].includes(role),
    );

  const invoiceMap = new Map(
    data.invoices.map((item) => [item.id, item]),
  );

  const supplierMap = new Map(
    data.suppliers.map((item) => [
      item.id,
      item.legalName,
    ]),
  );

  const itemMap = new Map<string, typeof data.items>();

  for (const item of data.items) {
    const existing =
      itemMap.get(item.paymentBatchId) ?? [];
    existing.push(item);
    itemMap.set(item.paymentBatchId, existing);
  }

  const batches =
    params.view === "settlements"
      ? data.batches.filter((batch) =>
          ["PROCESSING", "COMPLETED"].includes(
            batch.status,
          ),
        )
      : data.batches;

  return (
    <main className="space-y-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
          Accounts payable
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Payment Operations
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Manage approved payment-readiness cases, review and
          authorize payment runs, and send authorized batches into
          controlled payment processing. Final settlement remains a
          separate governed step.
        </p>
      </header>

      {params.message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-900">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          [
            "Ready for payment",
            data.readyCases.length,
          ],
          [
            "Awaiting authorization",
            data.batches.filter(
              (batch) =>
                batch.status ===
                "PENDING_APPROVAL",
            ).length,
          ],
          [
            "Settlement pending",
            data.batches.filter(
              (batch) =>
                batch.status === "PROCESSING",
            ).length,
          ],
          [
            "Settled",
            data.batches.filter(
              (batch) =>
                batch.status === "COMPLETED",
            ).length,
          ],
        ].map(([label, value]) => (
          <div className={card} key={String(label)}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Approved for payment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Readiness cases that passed the
              governed payment gate and have not
              been assigned to a payment run.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            CREATE DRAFT ENABLED
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.readyCases.length ? (
            data.readyCases.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <p className="font-black text-slate-950">
                  {item.readinessNumber}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Invoice{" "}
                  {item.invoiceNumber ?? "—"} ·{" "}
                  {money(
                    item.invoiceAmount,
                    item.currencyCode,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Due{" "}
                  {item.dueDate
                    ? item.dueDate.toLocaleDateString()
                    : "not specified"}
                </p>

                <form
                  action={createDraftPaymentRunAction}
                  className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
                >
                  <input
                    type="hidden"
                    name="readinessCaseId"
                    value={item.id}
                  />

                  <label className="text-xs font-bold text-slate-600">
                    Payment date
                    <input
                      type="date"
                      name="paymentDate"
                      defaultValue={
                        item.dueDate
                          ? item.dueDate.toISOString().slice(0, 10)
                          : ""
                      }
                      className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
                  >
                    Create draft payment run
                  </button>
                </form>
              </article>
            ))
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No approved readiness cases are waiting
              for payment batching.
            </p>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {params.view === "settlements"
                ? "Settlement register"
                : "Payment runs"}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Review existing payment batches and their
              lifecycle state.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              className={secondary}
              href="/app/requisition-to-order/payment-runs"
            >
              Payment runs
            </a>

            <a
              className={secondary}
              href="/app/requisition-to-order/settlements"
            >
              Settlements
            </a>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {batches.length ? (
            batches.map((batch) => {
              const batchItems =
                itemMap.get(batch.id) ?? [];

              return (
                <article
                  key={batch.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <p className="font-black text-slate-950">
                    {batch.batchNumber}
                  </p>

                  <p className="text-sm text-slate-600">
                    {money(
                      batch.totalAmount,
                      batch.currencyCode,
                    )}{" "}
                    · {batch.invoiceCount} invoice
                    {batch.invoiceCount === 1
                      ? ""
                      : "s"}{" "}
                    · {batch.status}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Payment date{" "}
                    {batch.paymentDate
                      ? batch.paymentDate.toLocaleDateString()
                      : "not scheduled"}
                  </p>

                  <div className="mt-4 space-y-2">
                    {batchItems.map((item) => {
                      const invoice =
                        invoiceMap.get(
                          item.supplierInvoiceId,
                        );

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-50 px-4 py-3 text-sm"
                        >
                          <span className="font-bold">
                            {invoice?.invoiceNumber ??
                              item.supplierInvoiceId}
                          </span>
                          {" · "}
                          {invoice
                            ? supplierMap.get(
                                invoice.supplierId,
                              ) ?? "Supplier"
                            : "Supplier"}
                          {" · "}
                          {money(
                            item.amount,
                            batch.currencyCode,
                          )}
                          {item.paymentReference
                            ? ` · Ref ${item.paymentReference}`
                            : ""}
                        </div>
                      );
                    })}
                  </div>

                  {batch.status === "DRAFT" ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-black">Draft review required</p>
                        <p className="mt-1 text-xs leading-5">
                          Confirm the invoice count, total amount, supplier,
                          payment date and included invoices before sending
                          this run to finance authorization.
                        </p>
                      </div>

                      <form
                        action={submitPaymentRunForApprovalAction}
                        className="mt-3"
                      >
                        <input
                          type="hidden"
                          name="paymentBatchId"
                          value={batch.id}
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800"
                        >
                          Submit for authorization
                        </button>
                      </form>
                    </div>
                  ) : batch.status === "PENDING_APPROVAL" ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <p className="font-black">
                          Awaiting finance authorization
                        </p>
                        <p className="mt-1 text-xs leading-5">
                          A different authorized finance user must review
                          and approve this payment run before execution.
                        </p>
                      </div>

                      {canAuthorizePaymentRun &&
                      batch.createdByUserId !==
                        data.currentUserId ? (
                        <form
                          action={authorizePaymentRunAction}
                          className="mt-3"
                        >
                          <input
                            type="hidden"
                            name="paymentBatchId"
                            value={batch.id}
                          />
                          <button
                            type="submit"
                            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
                          >
                            Authorize payment run
                          </button>
                        </form>
                      ) : (
                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {batch.createdByUserId ===
                          data.currentUserId
                            ? "You created this payment run, so segregation of duties prevents you from authorizing it."
                            : "Your current role can review this payment run but cannot authorize it."}
                        </p>
                      )}
                    </div>
                  ) : batch.status === "APPROVED" ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        <p className="font-black">
                          Authorized for payment execution
                        </p>
                        <p className="mt-1 text-xs leading-5">
                          Record the bank, treasury, ERP, or payment-provider
                          execution reference before sending this batch into
                          payment processing.
                        </p>
                      </div>

                      {canExecutePaymentRun &&
                      batch.approvedByUserId !==
                        data.currentUserId ? (
                        <form
                          action={executePaymentRunAction}
                          className="mt-3 flex flex-wrap items-end gap-3"
                        >
                          <input
                            type="hidden"
                            name="paymentBatchId"
                            value={batch.id}
                          />
                          <label className="text-xs font-bold text-slate-600">
                            Payment execution reference
                            <input
                              name="paymentReference"
                              required
                              placeholder="BANK-REF-123456"
                              className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
                          >
                            Execute payment run
                          </button>
                        </form>
                      ) : (
                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {batch.approvedByUserId ===
                          data.currentUserId
                            ? "You authorized this payment run, so segregation of duties prevents you from executing it."
                            : "Your current role can review this authorized payment run but cannot execute it."}
                        </p>
                      )}
                    </div>
                  ) : batch.status === "PROCESSING" ? (
                    <div className="mt-5 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
                      <p className="font-black">
                        Payment processing in progress
                      </p>
                      <p className="mt-1 text-xs">
                        Execution reference:{" "}
                        {batch.exportReference ?? "—"}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No payment runs are available in this
              view.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
