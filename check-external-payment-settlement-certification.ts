import { prisma } from "./src/lib/prisma";

async function main() {
  const settlements = await prisma.paymentSettlement.findMany({
    orderBy: { createdAt: "asc" },
  });

  const invoiceIds = [
    ...new Set(
      settlements.map((item) => item.supplierInvoiceId),
    ),
  ];

  const invoices = invoiceIds.length
    ? await prisma.supplierInvoice.findMany({
        where: { id: { in: invoiceIds } },
        select: {
          id: true,
          tenantId: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          paidAt: true,
        },
      })
    : [];

  const invoiceById = new Map(
    invoices.map((invoice) => [invoice.id, invoice]),
  );

  const problems: string[] = [];

  for (const settlement of settlements) {
    const invoice = invoiceById.get(
      settlement.supplierInvoiceId,
    );

    if (!invoice) {
      problems.push(
        `${settlement.id}: references missing SupplierInvoice ${settlement.supplierInvoiceId}`,
      );
      continue;
    }

    if (invoice.tenantId !== settlement.tenantId) {
      problems.push(
        `${settlement.id}: buyer tenant does not match SupplierInvoice tenant`,
      );
    }

    if (
      settlement.status === "CONFIRMED" &&
      !settlement.supplierConfirmedAt
    ) {
      problems.push(
        `${settlement.id}: CONFIRMED without supplierConfirmedAt`,
      );
    }

    if (
      settlement.status === "DISPUTED" &&
      !settlement.supplierDisputedAt
    ) {
      problems.push(
        `${settlement.id}: DISPUTED without supplierDisputedAt`,
      );
    }

    if (
      Number(settlement.paymentAmount) <= 0 ||
      Number(settlement.usdEquivalent) < 0
    ) {
      problems.push(
        `${settlement.id}: invalid payment amount`,
      );
    }
  }

  for (const invoice of invoices) {
    const confirmed = settlements
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

    const fullyExternallySettled =
      confirmed + 0.005 >= Number(invoice.totalAmount);

    if (
      fullyExternallySettled &&
      invoice.status !== "PAID"
    ) {
      problems.push(
        `${invoice.invoiceNumber}: confirmed external settlement covers invoice total but invoice is ${invoice.status}`,
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

  const summary = {
    settlementCount: settlements.length,
    confirmed: settlements.filter(
      (item) => item.status === "CONFIRMED",
    ).length,
    disputed: settlements.filter(
      (item) => item.status === "DISPUTED",
    ).length,
    overdue: settlements.filter(
      (item) =>
        item.status === "CONFIRMATION_OVERDUE",
    ).length,
    cancelled: settlements.filter(
      (item) => item.status === "CANCELLED",
    ).length,
    problems: problems.length,
  };

  console.table([summary]);

  if (problems.length) {
    console.error("\nCertification problems:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      "\nExternal settlement certification checks passed.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
