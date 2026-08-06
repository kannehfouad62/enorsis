import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function createThreeWayMatchCase(input: {
  purchaseOrderExecutionId: string;
  goodsReceiptSessionId: string;
  supplierInvoiceId: string;
  invoiceNumber?: string | null;
  invoiceAmount: number;
  invoicedQuantity: number;
  invoiceUnitPrice: number;
  lineReference: string;
  lineDescription: string;
  amountTolerancePercent: number;
  quantityTolerancePercent: number;
  actorUserId: string;
}) {
  const execution =
    await prisma.purchaseOrderExecution.findUniqueOrThrow({
      where: { id: input.purchaseOrderExecutionId },
      include: { journey: true },
    });

  const receipt =
    await prisma.goodsReceiptSession.findUniqueOrThrow({
      where: { id: input.goodsReceiptSessionId },
      include: { lines: true },
    });

  if (receipt.purchaseOrderExecutionId !== execution.id) {
    throw new Error(
      "The selected receipt does not belong to the selected purchase order.",
    );
  }

  if (!["PARTIALLY_ACCEPTED", "FULLY_ACCEPTED"].includes(receipt.status)) {
    throw new Error("Only accepted receipt sessions can be matched.");
  }

  const orderedQuantity = receipt.lines.reduce(
    (sum, line) => sum + Number(line.orderedQuantity),
    0,
  );
  const receivedQuantity = receipt.lines.reduce(
    (sum, line) => sum + Number(line.acceptedQuantity),
    0,
  );
  const poAmount = Number(execution.totalAmount);
  const receiptAmount =
    orderedQuantity > 0
      ? (receivedQuantity / orderedQuantity) * poAmount
      : 0;

  const amountVariance = input.invoiceAmount - receiptAmount;
  const quantityVariance = input.invoicedQuantity - receivedQuantity;
  const poUnitPrice =
    orderedQuantity > 0 ? poAmount / orderedQuantity : 0;
  const priceVariance = input.invoiceUnitPrice - poUnitPrice;

  const amountTolerance =
    Math.abs(receiptAmount) * (input.amountTolerancePercent / 100);
  const quantityTolerance =
    Math.abs(receivedQuantity) *
    (input.quantityTolerancePercent / 100);

  const amountPass = Math.abs(amountVariance) <= amountTolerance;
  const quantityPass =
    Math.abs(quantityVariance) <= quantityTolerance;
  const pricePass =
    Math.abs(priceVariance * input.invoicedQuantity) <=
    amountTolerance;

  const lineStatus = !quantityPass
    ? "QUANTITY_VARIANCE"
    : !pricePass
      ? "PRICE_VARIANCE"
      : !amountPass
        ? "AMOUNT_VARIANCE"
        : "MATCHED";

  const hasNonBlockingVariance =
    lineStatus === "MATCHED" &&
    (amountVariance !== 0 ||
      quantityVariance !== 0 ||
      priceVariance !== 0);

  const status =
    lineStatus !== "MATCHED"
      ? "EXCEPTION"
      : hasNonBlockingVariance
        ? "MATCHED_WITH_WARNINGS"
        : "MATCHED";

  const count = await prisma.threeWayMatchCase.count({
    where: { tenantId: execution.tenantId },
  });
  const matchNumber = `3WM-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const matchCase = await prisma.threeWayMatchCase.create({
    data: {
      tenantId: execution.tenantId,
      purchaseOrderExecutionId: execution.id,
      goodsReceiptSessionId: receipt.id,
      supplierInvoiceId: input.supplierInvoiceId,
      matchNumber,
      invoiceNumber: input.invoiceNumber ?? null,
      currencyCode: execution.currencyCode,
      status,
      poAmount,
      receiptAmount,
      invoiceAmount: input.invoiceAmount,
      amountVariance,
      quantityTolerancePercent: input.quantityTolerancePercent,
      amountTolerancePercent: input.amountTolerancePercent,
      matchedAt: status === "EXCEPTION" ? null : new Date(),
      createdByUserId: input.actorUserId,
      lines: {
        create: {
          lineReference: input.lineReference,
          description: input.lineDescription,
          orderedQuantity,
          receivedQuantity,
          invoicedQuantity: input.invoicedQuantity,
          poUnitPrice,
          invoiceUnitPrice: input.invoiceUnitPrice,
          poLineAmount: poAmount,
          invoiceLineAmount: input.invoiceAmount,
          quantityVariance,
          priceVariance,
          amountVariance,
          status: lineStatus,
          evidence: toJson({
            orderNumber: execution.orderNumber,
            receiptNumber: receipt.receiptNumber,
          }),
        },
      },
      exceptions:
        lineStatus === "MATCHED"
          ? undefined
          : {
              create: {
                exceptionType:
                  lineStatus === "QUANTITY_VARIANCE"
                    ? "QUANTITY_VARIANCE"
                    : lineStatus === "PRICE_VARIANCE"
                      ? "PRICE_VARIANCE"
                      : "AMOUNT_VARIANCE",
                severity:
                  Math.abs(amountVariance) >
                  Math.max(amountTolerance * 2, 1)
                    ? "HIGH"
                    : "MEDIUM",
                title: `${lineStatus.replaceAll("_", " ")} detected`,
                description:
                  `PO ${execution.orderNumber}, receipt ${receipt.receiptNumber}, invoice ${input.invoiceNumber ?? input.supplierInvoiceId}.`,
                ownerUserId: input.actorUserId,
              },
            },
    },
    include: { lines: true, exceptions: true },
  });

  await publishDomainEvent({
    tenantId: execution.tenantId,
    eventType: "ThreeWayMatch.Completed",
    aggregateType: "ThreeWayMatchCase",
    aggregateId: matchCase.id,
    sourceModule: "requisition-to-order",
    correlationId: execution.journey.correlationId,
    actorUserId: input.actorUserId,
    payload: {
      matchCaseId: matchCase.id,
      matchNumber,
      status,
      supplierInvoiceId: input.supplierInvoiceId,
    },
  });

  await recordEnterpriseActivity({
    tenantId: execution.tenantId,
    activityType: "ThreeWayMatch.Completed",
    sourceModule: "requisition-to-order",
    title: "Three-way match completed",
    description: `${matchNumber} — ${status}`,
    severity: status === "EXCEPTION" ? "WARNING" : "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ThreeWayMatchCase",
    subjectId: matchCase.id,
    subjectLabel: matchNumber,
    actionUrl: "/app/requisition-to-order/three-way-match",
    correlationId: execution.journey.correlationId,
  });

  return matchCase;
}

export async function resolveThreeWayMatchException(input: {
  exceptionId: string;
  resolution: string;
  actorUserId: string;
  waive?: boolean;
}) {
  const exception =
    await prisma.threeWayMatchException.findUniqueOrThrow({
      where: { id: input.exceptionId },
    });

  const updated = await prisma.threeWayMatchException.update({
    where: { id: input.exceptionId },
    data: {
      status: input.waive ? "WAIVED" : "RESOLVED",
      resolution: input.resolution,
      resolvedAt: new Date(),
      ownerUserId: input.actorUserId,
    },
  });

  const remaining = await prisma.threeWayMatchException.count({
    where: {
      matchCaseId: exception.matchCaseId,
      status: { in: ["OPEN", "INVESTIGATING"] },
    },
  });

  if (remaining === 0) {
    await prisma.threeWayMatchCase.update({
      where: { id: exception.matchCaseId },
      data: {
        status: "MATCHED_WITH_WARNINGS",
        matchedAt: new Date(),
      },
    });
  }

  return updated;
}

export async function approveThreeWayMatchForPayment(input: {
  matchCaseId: string;
  actorUserId: string;
}) {
  const matchCase = await prisma.threeWayMatchCase.findUniqueOrThrow({
    where: { id: input.matchCaseId },
    include: {
      exceptions: true,
      purchaseOrderExecution: {
        include: { journey: true },
      },
    },
  });

  const unresolved = matchCase.exceptions.some((exception) =>
    ["OPEN", "INVESTIGATING"].includes(exception.status),
  );

  if (
    unresolved ||
    !["MATCHED", "MATCHED_WITH_WARNINGS"].includes(matchCase.status)
  ) {
    throw new Error(
      "The match case must be matched with no unresolved exceptions.",
    );
  }

  const updated = await prisma.threeWayMatchCase.update({
    where: { id: input.matchCaseId },
    data: {
      status: "APPROVED_FOR_PAYMENT",
      approvedForPaymentAt: new Date(),
      approvedByUserId: input.actorUserId,
    },
  });

  await publishDomainEvent({
    tenantId: matchCase.tenantId,
    eventType: "ThreeWayMatch.ApprovedForPayment",
    aggregateType: "ThreeWayMatchCase",
    aggregateId: matchCase.id,
    sourceModule: "requisition-to-order",
    correlationId:
      matchCase.purchaseOrderExecution.journey.correlationId,
    actorUserId: input.actorUserId,
    payload: {
      matchCaseId: matchCase.id,
      supplierInvoiceId: matchCase.supplierInvoiceId,
      invoiceAmount: matchCase.invoiceAmount.toString(),
    },
  });

  return updated;
}
