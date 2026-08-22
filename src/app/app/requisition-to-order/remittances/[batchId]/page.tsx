import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PrintRemittanceButton } from "./print-button";

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function RemittanceAdvicePage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "FINANCE",
      "ACCOUNTS_PAYABLE",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  const { batchId } = await params;

  const batch = await prisma.paymentBatch.findFirst({
    where: {
      id: batchId,
      tenantId: session.user.tenantId,
      status: "COMPLETED",
    },
    include: {
      tenant: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          supplierInvoice: {
            include: {
              supplier: {
                select: {
                  legalName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!batch) {
    redirect("/app/requisition-to-order/payments?view=settlements");
  }

  const supplierNames = [
    ...new Set(
      batch.items.map(
        (item) => item.supplierInvoice.supplier.legalName,
      ),
    ),
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 bg-white px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Remittance advice
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {batch.batchNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Payment confirmation issued by {batch.tenant.name}
          </p>
        </div>

        <PrintRemittanceButton />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Status", "PAID"],
          ["Currency", batch.currencyCode],
          [
            "Settlement date",
            batch.completedAt
              ? batch.completedAt.toLocaleDateString()
              : "—",
          ],
          [
            "Payment reference",
            batch.exportReference ?? "—",
          ],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-sm font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-950">
          Supplier
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          {supplierNames.join(", ")}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-black text-slate-950">
            Paid invoices
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {batch.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-black text-slate-950">
                  {item.supplierInvoice.invoiceNumber}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.supplierInvoice.supplier.legalName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Invoice date{" "}
                  {item.supplierInvoice.invoiceDate.toLocaleDateString()}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="font-black text-slate-950">
                  {money(item.amount, batch.currencyCode)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ref {item.paymentReference ?? batch.exportReference ?? "—"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
          <span className="font-black text-slate-700">
            Total remitted
          </span>
          <span className="text-lg font-black text-slate-950">
            {money(batch.totalAmount, batch.currencyCode)}
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-slate-50 p-5 text-xs leading-6 text-slate-600">
        This remittance advice confirms that the invoices listed above
        were included in the referenced payment run and recorded as paid
        in Enorsis. Retain this document with the related invoice and
        purchase-order records for reconciliation and audit purposes.
      </section>
    </main>
  );
}
