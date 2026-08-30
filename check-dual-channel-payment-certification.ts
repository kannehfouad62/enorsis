import { prisma } from "./src/lib/prisma";

async function main() {
  const [
    invoices,
    readinessCases,
    nativeItems,
    externalSettlements,
  ] = await Promise.all([
    prisma.supplierInvoice.findMany({
      select: {
        id: true,
        tenantId: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        paidAt: true,
      },
    }),
    prisma.apPaymentReadinessCase.findMany({
      select: {
        id: true,
        tenantId: true,
        supplierInvoiceId: true,
        status: true,
        paymentBatchId: true,
        settlementChannel: true,
      },
    }),
    prisma.paymentBatchItem.findMany({
      include: {
        paymentBatch: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            batchNumber: true,
          },
        },
      },
    }),
    prisma.paymentSettlement.findMany({
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const problems: string[] = [];
  const invoiceById = new Map(
    invoices.map((invoice) => [invoice.id, invoice]),
  );

  const activeNativeStatuses = new Set([
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "EXPORTED",
    "PROCESSING",
    "COMPLETED",
  ]);

  const activeExternalStatuses = new Set([
    "BUYER_RECORDED",
    "AWAITING_SUPPLIER_CONFIRMATION",
    "CONFIRMED",
    "CONFIRMATION_OVERDUE",
    "DISPUTED",
  ]);

  for (const readiness of readinessCases) {
    const invoice = invoiceById.get(
      readiness.supplierInvoiceId,
    );

    if (!invoice) {
      problems.push(
        `${readiness.id}: readiness references missing invoice ${readiness.supplierInvoiceId}`,
      );
      continue;
    }

    if (invoice.tenantId !== readiness.tenantId) {
      problems.push(
        `${readiness.id}: readiness/invoice tenant mismatch`,
      );
    }

    if (
      readiness.paymentBatchId &&
      readiness.settlementChannel === "EXTERNAL"
    ) {
      problems.push(
        `${readiness.id}: external settlement readiness also has paymentBatchId`,
      );
    }

    if (
      readiness.paymentBatchId &&
      readiness.settlementChannel !==
        "ENORSIS_NATIVE"
    ) {
      problems.push(
        `${readiness.id}: native payment batch missing ENORSIS_NATIVE channel`,
      );
    }
  }

  for (const invoice of invoices) {
    const activeNative = nativeItems.filter(
      (item) =>
        item.supplierInvoiceId === invoice.id &&
        activeNativeStatuses.has(
          item.paymentBatch.status,
        ),
    );

    const activeExternal = externalSettlements.filter(
      (item) =>
        item.supplierInvoiceId === invoice.id &&
        activeExternalStatuses.has(item.status),
    );

    if (
      activeNative.some(
        (item) =>
          item.paymentBatch.status !== "CANCELLED",
      ) &&
      activeExternal.some(
        (item) => item.status !== "CANCELLED",
      )
    ) {
      problems.push(
        `${invoice.invoiceNumber}: active native and external settlement paths overlap`,
      );
    }

    const confirmedExternal = externalSettlements
      .filter(
        (item) =>
          item.supplierInvoiceId === invoice.id &&
          item.status === "CONFIRMED",
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.paymentAmount),
        0,
      );

    const completedNative = nativeItems
      .filter(
        (item) =>
          item.supplierInvoiceId === invoice.id &&
          item.paymentBatch.status === "COMPLETED",
      )
      .reduce(
        (sum, item) => sum + Number(item.amount),
        0,
      );

    const settledAmount =
      confirmedExternal + completedNative;

    if (
      settledAmount >
      Number(invoice.totalAmount) + 0.005
    ) {
      problems.push(
        `${invoice.invoiceNumber}: confirmed/native settlement exceeds invoice total`,
      );
    }

    if (
      settledAmount + 0.005 >=
        Number(invoice.totalAmount) &&
      invoice.status !== "PAID"
    ) {
      problems.push(
        `${invoice.invoiceNumber}: fully settled but invoice status is ${invoice.status}`,
      );
    }

    if (
      invoice.status === "PAID" &&
      !invoice.paidAt
    ) {
      problems.push(
        `${invoice.invoiceNumber}: PAID without paidAt`,
      );
    }
  }

  const externalPending =
    externalSettlements.filter((item) =>
      [
        "BUYER_RECORDED",
        "AWAITING_SUPPLIER_CONFIRMATION",
        "CONFIRMATION_OVERDUE",
        "DISPUTED",
      ].includes(item.status),
    );

  console.table([
    {
      invoices: invoices.length,
      readinessCases: readinessCases.length,
      nativePaymentItems: nativeItems.length,
      externalSettlements:
        externalSettlements.length,
      externalPending: externalPending.length,
      problems: problems.length,
    },
  ]);

  if (problems.length) {
    console.error(
      "\nDual-channel payment certification problems:",
    );
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nDual-channel payment certification passed.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
