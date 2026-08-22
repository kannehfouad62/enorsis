import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getPaymentOperationsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => allowedRoles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [readyCases, batches] = await Promise.all([
    prisma.apPaymentReadinessCase.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        paymentBatchId: null,
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.paymentBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const batchIds = batches.map((batch) => batch.id);

  const items = batchIds.length
    ? await prisma.paymentBatchItem.findMany({
        where: {
          paymentBatchId: { in: batchIds },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const invoiceIds = [
    ...new Set(
      items.map((item) => item.supplierInvoiceId),
    ),
  ];

  const invoices = invoiceIds.length
    ? await prisma.supplierInvoice.findMany({
        where: {
          tenantId,
          id: { in: invoiceIds },
        },
        select: {
          id: true,
          invoiceNumber: true,
          supplierId: true,
          status: true,
          totalAmount: true,
          currencyCode: true,
          dueDate: true,
          paidAt: true,
        },
      })
    : [];

  const supplierIds = [
    ...new Set(
      invoices.map((invoice) => invoice.supplierId),
    ),
  ];

  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({
        where: {
          id: { in: supplierIds },
        },
        select: {
          id: true,
          legalName: true,
        },
      })
    : [];

  const now = new Date();

  const awaitingAuthorization = batches.filter(
    (batch) => batch.status === "PENDING_APPROVAL",
  );
  const awaitingExecution = batches.filter(
    (batch) => batch.status === "APPROVED",
  );
  const settlementPending = batches.filter(
    (batch) => batch.status === "PROCESSING",
  );
  const completedBatches = batches.filter(
    (batch) => batch.status === "COMPLETED",
  );
  const openInvoices = invoices.filter(
    (invoice) => invoice.status !== "PAID",
  );
  const overdueInvoices = openInvoices.filter(
    (invoice) =>
      invoice.dueDate !== null &&
      invoice.dueDate.getTime() < now.getTime(),
  );
  const dueNextSevenDays = openInvoices.filter((invoice) => {
    if (!invoice.dueDate) return false;
    const diff = invoice.dueDate.getTime() - now.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  });

  const sumBatchUsd = (source: typeof batches) =>
    source.reduce(
      (sum, batch) =>
        sum + Number(batch.totalUsdEquivalent ?? 0),
      0,
    );

  const sumInvoiceUsd = (source: typeof invoices) =>
    source.reduce(
      (sum, invoice) =>
        sum + Number(invoice.totalAmount ?? 0),
      0,
    );

  const supplierExposure = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      amount: number;
      invoices: number;
    }
  >();

  for (const invoice of openInvoices) {
    const current = supplierExposure.get(invoice.supplierId) ?? {
      supplierId: invoice.supplierId,
      supplierName:
        suppliers.find(
          (supplier) => supplier.id === invoice.supplierId,
        )?.legalName ?? "Supplier",
      amount: 0,
      invoices: 0,
    };

    current.amount += Number(invoice.totalAmount ?? 0);
    current.invoices += 1;
    supplierExposure.set(invoice.supplierId, current);
  }

  const financeMetrics = {
    awaitingAuthorizationCount: awaitingAuthorization.length,
    awaitingAuthorizationUsd: sumBatchUsd(awaitingAuthorization),
    awaitingExecutionCount: awaitingExecution.length,
    awaitingExecutionUsd: sumBatchUsd(awaitingExecution),
    settlementPendingCount: settlementPending.length,
    settlementPendingUsd: sumBatchUsd(settlementPending),
    settledCount: completedBatches.length,
    settledUsd: sumBatchUsd(completedBatches),
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceUsd: sumInvoiceUsd(overdueInvoices),
    dueNextSevenDaysCount: dueNextSevenDays.length,
    dueNextSevenDaysUsd: sumInvoiceUsd(dueNextSevenDays),
    openPayablesUsd: sumInvoiceUsd(openInvoices),
    topSupplierExposure: [...supplierExposure.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };

  return {
    currentUserId: session.user.id,
    currentUserRoles: session.user.roles,
    readyCases,
    batches,
    items,
    invoices,
    suppliers,
    financeMetrics,
  };
}
