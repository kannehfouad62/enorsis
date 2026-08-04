import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const percent = (numerator: number, denominator: number, fallback = 100) =>
  denominator === 0 ? fallback : clamp((numerator / denominator) * 100);

function performanceRating(score: number) {
  if (score >= 90) return "EXCEPTIONAL" as const;
  if (score >= 80) return "STRONG" as const;
  if (score >= 70) return "ACCEPTABLE" as const;
  if (score >= 55) return "NEEDS_IMPROVEMENT" as const;
  return "CRITICAL" as const;
}

export async function calculateSupplierPerformance({
  tenantId,
  supplierId,
  periodStart,
  periodEnd,
}: {
  tenantId: string;
  supplierId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const supplier = await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId },
    include: {
      purchaseOrders: {
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          lines: true,
          receipts: true,
          invoices: {
            include: {
              exceptions: true,
            },
          },
        },
      },
      riskAssessments: {
        where: {
          createdAt: { lte: periodEnd },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      riskFindings: {
        where: {
          createdAt: { lte: periodEnd },
          status: { not: "RESOLVED" },
        },
      },
      esgAssessments: {
        where: {
          assessedAt: { lte: periodEnd },
        },
        orderBy: { assessedAt: "desc" },
        take: 1,
      },
      documents: true,
      correctiveActions: {
        where: {
          createdAt: { lte: periodEnd },
          status: { not: "CLOSED" },
        },
      },
    },
  });

  const orders = supplier.purchaseOrders;
  const completedOrders = orders.filter((order) =>
    ["CLOSED", "FULLY_RECEIVED"].includes(order.status),
  );
  const onTimeOrders = completedOrders.filter((order) => {
    if (!order.requestedDeliveryDate) return true;
    const latestReceipt = order.receipts
      .map((receipt) => receipt.receivedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return latestReceipt
      ? latestReceipt <= order.requestedDeliveryDate
      : false;
  });

  const orderedQuantity = orders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce(
        (lineSum, line) => lineSum + Number(line.quantity),
        0,
      ),
    0,
  );
  const receivedQuantity = orders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce(
        (lineSum, line) => lineSum + Number(line.receivedQuantity),
        0,
      ),
    0,
  );

  const invoices = orders.flatMap((order) => order.invoices);
  const matchedInvoices = invoices.filter(
    (invoice) => invoice.matchStatus === "MATCHED",
  );
  const invoiceExceptions = invoices.flatMap(
    (invoice) => invoice.exceptions,
  );
  const openExceptions = invoiceExceptions.filter(
    (exception) => exception.status === "OPEN",
  );

  const activeFindings = supplier.riskFindings;
  const highSeverityFindings = activeFindings.filter(
    (finding) => finding.severity >= 4,
  );
  const latestRisk = supplier.riskAssessments[0];
  const latestEsg = supplier.esgAssessments[0];

  const validDocuments = supplier.documents.filter(
    (document) =>
      document.status === "VERIFIED" &&
      (!document.expiresAt || document.expiresAt >= periodEnd),
  );
  const expiredDocuments = supplier.documents.filter(
    (document) =>
      Boolean(document.expiresAt && document.expiresAt < periodEnd),
  );

  const deliveryScore =
    completedOrders.length > 0
      ? percent(onTimeOrders.length, completedOrders.length)
      : percent(receivedQuantity, orderedQuantity);

  const qualityScore = clamp(
    100 -
      openExceptions.length * 8 -
      supplier.correctiveActions.length * 6,
  );

  const costScore = percent(matchedInvoices.length, invoices.length);
  const serviceScore = clamp(
    100 -
      activeFindings.length * 5 -
      supplier.correctiveActions.length * 5,
  );
  const innovationScore = 70;
  const esgScore = latestEsg ? clamp(latestEsg.overallScore) : 50;
  const riskScore = latestRisk
    ? clamp(100 - latestRisk.residualRiskScore)
    : clamp(80 - activeFindings.length * 5 - highSeverityFindings.length * 10);
  const complianceScore = clamp(
    100 -
      expiredDocuments.length * 15 -
      Math.max(0, supplier.documents.length - validDocuments.length) * 5,
  );

  const overallScore =
    deliveryScore * 0.2 +
    qualityScore * 0.2 +
    costScore * 0.15 +
    serviceScore * 0.1 +
    innovationScore * 0.1 +
    esgScore * 0.1 +
    riskScore * 0.1 +
    complianceScore * 0.05;

  return {
    supplier,
    scores: {
      deliveryScore,
      qualityScore,
      costScore,
      serviceScore,
      innovationScore,
      esgScore,
      riskScore,
      complianceScore,
      overallScore,
      rating: performanceRating(overallScore),
    },
    evidence: {
      purchaseOrderCount: orders.length,
      completedOrderCount: completedOrders.length,
      onTimeOrderCount: onTimeOrders.length,
      orderedQuantity,
      receivedQuantity,
      invoiceCount: invoices.length,
      matchedInvoiceCount: matchedInvoices.length,
      openInvoiceExceptionCount: openExceptions.length,
      activeRiskFindingCount: activeFindings.length,
      highSeverityRiskFindingCount: highSeverityFindings.length,
      openCorrectiveActionCount: supplier.correctiveActions.length,
      verifiedDocumentCount: validDocuments.length,
      expiredDocumentCount: expiredDocuments.length,
      latestResidualRiskScore: latestRisk?.residualRiskScore ?? null,
      latestEsgScore: latestEsg?.overallScore ?? null,
    } satisfies Prisma.InputJsonObject,
  };
}
