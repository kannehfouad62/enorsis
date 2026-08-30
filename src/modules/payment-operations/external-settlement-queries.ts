import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getExternalSettlementWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [
    approvedReadiness,
    buyerSettlements,
    sellerSettlements,
  ] = await Promise.all([
    prisma.apPaymentReadinessCase.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        paymentBatchId: null,
        OR: [
          { settlementChannel: null },
          { settlementChannel: "EXTERNAL" },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentSettlement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentSettlement.findMany({
      where: { sellerTenantId: tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invoiceIds = [
    ...new Set([
      ...approvedReadiness.map((item) => item.supplierInvoiceId),
      ...buyerSettlements.map((item) => item.supplierInvoiceId),
      ...sellerSettlements.map((item) => item.supplierInvoiceId),
    ]),
  ];

  const invoices = invoiceIds.length
    ? await prisma.supplierInvoice.findMany({
        where: { id: { in: invoiceIds } },
        include: { supplier: true },
      })
    : [];

  const invoiceById = new Map(
    invoices.map((invoice) => [invoice.id, invoice]),
  );

  const buyerDeclared = buyerSettlements
    .filter((item) =>
      [
        "BUYER_RECORDED",
        "AWAITING_SUPPLIER_CONFIRMATION",
        "CONFIRMED",
      ].includes(item.status),
    )
    .reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    );

  const buyerConfirmed = buyerSettlements
    .filter((item) => item.status === "CONFIRMED")
    .reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    );

  const supplierConfirmed = sellerSettlements
    .filter((item) => item.status === "CONFIRMED")
    .reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    );

  const awaitingSupplierConfirmation =
    sellerSettlements.filter(
      (item) =>
        item.status === "AWAITING_SUPPLIER_CONFIRMATION",
    );

  return {
    approvedReadiness,
    buyerSettlements,
    sellerSettlements,
    awaitingSupplierConfirmation,
    invoiceById,
    intelligence: {
      buyerDeclared,
      buyerConfirmed,
      buyerPending: buyerDeclared - buyerConfirmed,
      supplierConfirmed,
      supplierPending:
        awaitingSupplierConfirmation.reduce(
          (sum, item) =>
            sum + Number(item.usdEquivalent),
          0,
        ),
      disputes: [
        ...buyerSettlements,
        ...sellerSettlements,
      ].filter((item) => item.status === "DISPUTED").length,
      overdueConfirmations: [
        ...buyerSettlements,
        ...sellerSettlements,
      ].filter(
        (item) => item.status === "CONFIRMATION_OVERDUE",
      ).length,
      cancelled: buyerSettlements.filter(
        (item) => item.status === "CANCELLED",
      ).length,
      externalSettlementCount: buyerSettlements.length,
      confirmedSettlementCount: buyerSettlements.filter(
        (item) => item.status === "CONFIRMED",
      ).length,
      reconciliationGapUsd:
        buyerSettlements
          .filter((item) =>
            [
              "BUYER_RECORDED",
              "AWAITING_SUPPLIER_CONFIRMATION",
              "CONFIRMATION_OVERDUE",
              "DISPUTED",
            ].includes(item.status),
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.usdEquivalent),
            0,
          ),
    },
  };
}

export async function getExternalSettlementReconciliationSummary(
  tenantId: string,
) {
  const settlements = await prisma.paymentSettlement.findMany({
    where: {
      tenantId,
      channel: "EXTERNAL",
    },
    orderBy: { createdAt: "desc" },
  });

  const confirmed = settlements.filter(
    (item) => item.status === "CONFIRMED",
  );
  const pending = settlements.filter((item) =>
    [
      "BUYER_RECORDED",
      "AWAITING_SUPPLIER_CONFIRMATION",
      "CONFIRMATION_OVERDUE",
    ].includes(item.status),
  );
  const disputed = settlements.filter(
    (item) => item.status === "DISPUTED",
  );
  const cancelled = settlements.filter(
    (item) => item.status === "CANCELLED",
  );

  return {
    totalCount: settlements.length,
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    disputedCount: disputed.length,
    cancelledCount: cancelled.length,
    confirmedUsd: confirmed.reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    ),
    pendingUsd: pending.reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    ),
    disputedUsd: disputed.reduce(
      (sum, item) => sum + Number(item.usdEquivalent),
      0,
    ),
    latest: settlements.slice(0, 12),
  };
}

