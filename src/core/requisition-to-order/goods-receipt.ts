import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { transitionRequisitionOrderJourney } from "./service";
import {
  advanceGovernedRtoAfterReceipt,
} from "@/core/finance-automation/receipt-finance-orchestration";

export async function createGoodsReceiptSession({
  purchaseOrderExecutionId,
  receivedByUserId,
  deliveryReference,
  carrierReference,
  locationReference,
  notes,
  line,
}: {
  purchaseOrderExecutionId: string;
  receivedByUserId: string;
  deliveryReference?: string | null;
  carrierReference?: string | null;
  locationReference?: string | null;
  notes?: string | null;
  line: {
    lineReference: string;
    description: string;
    orderedQuantity: number;
    previouslyReceived?: number;
    receivedQuantity: number;
    unitOfMeasure?: string;
    condition: "ACCEPTED" | "DAMAGED" | "REJECTED" | "QUARANTINED";
    serialOrLotReference?: string | null;
  };
}) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: purchaseOrderExecutionId },
    include: { journey: true },
  });

  if (!["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(execution.status)) {
    throw new Error("Only issued or acknowledged purchase orders can be received.");
  }

  const count = await prisma.goodsReceiptSession.count({
    where: { tenantId: execution.tenantId },
  });
  const receiptNumber = `GR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const received = line.receivedQuantity;
  const accepted =
    line.condition === "ACCEPTED" ? received : 0;
  const damaged =
    line.condition === "DAMAGED" ? received : 0;
  const rejected =
    line.condition === "REJECTED" ? received : 0;

  const session = await prisma.goodsReceiptSession.create({
    data: {
      tenantId: execution.tenantId,
      journeyId: execution.journeyId,
      purchaseOrderExecutionId,
      receiptNumber,
      receivedByUserId,
      deliveryReference: deliveryReference ?? null,
      carrierReference: carrierReference ?? null,
      locationReference: locationReference ?? null,
      notes: notes ?? null,
      lines: {
        create: {
          lineReference: line.lineReference,
          description: line.description,
          orderedQuantity: line.orderedQuantity,
          previouslyReceived: line.previouslyReceived ?? 0,
          receivedQuantity: received,
          acceptedQuantity: accepted,
          damagedQuantity: damaged,
          rejectedQuantity: rejected,
          unitOfMeasure: line.unitOfMeasure ?? "EA",
          condition: line.condition,
          serialOrLotReference: line.serialOrLotReference ?? null,
        },
      },
    },
    include: { lines: true },
  });

  return session;
}

export async function postGoodsReceiptSession({
  receiptSessionId,
  actorUserId,
  overReceiptTolerancePercent = 0,
  underReceiptTolerancePercent = 0,
}: {
  receiptSessionId: string;
  actorUserId: string;
  overReceiptTolerancePercent?: number;
  underReceiptTolerancePercent?: number;
}) {
  const session = await prisma.goodsReceiptSession.findUniqueOrThrow({
    where: { id: receiptSessionId },
    include: {
      lines: true,
      purchaseOrderExecution: true,
      journey: true,
    },
  });

  if (session.status !== "DRAFT") {
    throw new Error("Only draft receipt sessions can be posted.");
  }

  const exceptions: Array<{
    receiptSessionId: string;
    receiptLineId: string;
    exceptionType:
      | "OVER_RECEIPT"
      | "UNDER_RECEIPT"
      | "DAMAGED_GOODS"
      | "REJECTED_GOODS"
      | "QUALITY_HOLD";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    ownerUserId: string;
  }> = [];

  for (const line of session.lines) {
    const ordered = Number(line.orderedQuantity);
    const cumulative =
      Number(line.previouslyReceived) + Number(line.receivedQuantity);
    const overLimit = ordered * (1 + overReceiptTolerancePercent / 100);
    const underLimit = ordered * (1 - underReceiptTolerancePercent / 100);

    if (cumulative > overLimit) {
      exceptions.push({
        receiptSessionId: session.id,
        receiptLineId: line.id,
        exceptionType: "OVER_RECEIPT",
        severity: "HIGH",
        title: "Over-receipt tolerance exceeded",
        description: `${cumulative} received against ${ordered} ordered.`,
        ownerUserId: actorUserId,
      });
    }

    if (cumulative < underLimit) {
      exceptions.push({
        receiptSessionId: session.id,
        receiptLineId: line.id,
        exceptionType: "UNDER_RECEIPT",
        severity: "MEDIUM",
        title: "Under-receipt detected",
        description: `${cumulative} received against ${ordered} ordered.`,
        ownerUserId: actorUserId,
      });
    }

    if (line.condition === "DAMAGED") {
      exceptions.push({
        receiptSessionId: session.id,
        receiptLineId: line.id,
        exceptionType: "DAMAGED_GOODS",
        severity: "HIGH",
        title: "Damaged goods received",
        description: `${line.damagedQuantity.toString()} ${line.unitOfMeasure} damaged.`,
        ownerUserId: actorUserId,
      });
    }

    if (line.condition === "REJECTED") {
      exceptions.push({
        receiptSessionId: session.id,
        receiptLineId: line.id,
        exceptionType: "REJECTED_GOODS",
        severity: "HIGH",
        title: "Goods rejected",
        description: `${line.rejectedQuantity.toString()} ${line.unitOfMeasure} rejected.`,
        ownerUserId: actorUserId,
      });
    }

    if (line.condition === "QUARANTINED") {
      exceptions.push({
        receiptSessionId: session.id,
        receiptLineId: line.id,
        exceptionType: "QUALITY_HOLD",
        severity: "CRITICAL",
        title: "Receipt placed on quality hold",
        description: "The received goods require quality disposition.",
        ownerUserId: actorUserId,
      });
    }
  }

  const accepted = session.lines.reduce(
    (sum, line) => sum + Number(line.acceptedQuantity),
    0,
  );
  const ordered = session.lines.reduce(
    (sum, line) => sum + Number(line.orderedQuantity),
    0,
  );

  const sessionStatus =
    exceptions.some((item) => item.severity === "CRITICAL")
      ? "REJECTED"
      : accepted >= ordered
        ? "FULLY_ACCEPTED"
        : "PARTIALLY_ACCEPTED";

  await prisma.$transaction(async (tx) => {
    await tx.goodsReceiptSession.update({
      where: { id: session.id },
      data: { status: sessionStatus },
    });

    if (exceptions.length > 0) {
      await tx.goodsReceiptException.createMany({ data: exceptions });
    }

    await tx.purchaseOrderExecution.update({
      where: { id: session.purchaseOrderExecutionId },
      data: {
        status:
          sessionStatus === "FULLY_ACCEPTED"
            ? "FULLY_RECEIVED"
            : "PARTIALLY_RECEIVED",
      },
    });

    await tx.requisitionOrderJourney.update({
      where: { id: session.journeyId },
      data: {
        status:
          sessionStatus === "FULLY_ACCEPTED"
            ? "RECEIVED"
            : "PARTIALLY_RECEIVED",
        receivedAt:
          sessionStatus === "FULLY_ACCEPTED" ? new Date() : undefined,
        milestones: {
          create: {
            milestoneType: "RECEIPT_RECORDED",
            title: "Goods receipt posted",
            description: session.receiptNumber,
            actorUserId,
            sourceModule: "requisition-to-order",
            sourceRecordId: session.id,
          },
        },
      },
    });
  });

  await publishDomainEvent({
    tenantId: session.tenantId,
    eventType: "GoodsReceipt.Posted",
    aggregateType: "GoodsReceiptSession",
    aggregateId: session.id,
    sourceModule: "requisition-to-order",
    correlationId: session.journey.correlationId,
    actorUserId,
    payload: {
      receiptSessionId: session.id,
      receiptNumber: session.receiptNumber,
      status: sessionStatus,
      exceptionCount: exceptions.length,
    },
  });

  await recordEnterpriseActivity({
    tenantId: session.tenantId,
    activityType: "GoodsReceipt.Posted",
    sourceModule: "requisition-to-order",
    title: "Goods receipt posted",
    description: session.receiptNumber,
    severity: exceptions.length > 0 ? "WARNING" : "SUCCESS",
    actorUserId,
    subjectType: "GoodsReceiptSession",
    subjectId: session.id,
    subjectLabel: session.receiptNumber,
    actionUrl: "/app/requisition-to-order/receipts",
    correlationId: session.journey.correlationId,
  });

  if (sessionStatus === "FULLY_ACCEPTED") {
    await advanceGovernedRtoAfterReceipt({
      purchaseOrderExecutionId:
        session.purchaseOrderExecutionId,
      actorUserId,
    });
  }

  return prisma.goodsReceiptSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { lines: true, exceptions: true },
  });
}

export async function resolveGoodsReceiptException({
  exceptionId,
  actorUserId,
  resolution,
}: {
  exceptionId: string;
  actorUserId: string;
  resolution: string;
}) {
  const exception = await prisma.goodsReceiptException.findUniqueOrThrow({
    where: { id: exceptionId },
    include: { receiptSession: { include: { journey: true } } },
  });

  const updated = await prisma.goodsReceiptException.update({
    where: { id: exceptionId },
    data: {
      status: "RESOLVED",
      resolution,
      resolvedAt: new Date(),
      ownerUserId: actorUserId,
    },
  });

  await publishDomainEvent({
    tenantId: exception.receiptSession.tenantId,
    eventType: "GoodsReceipt.ExceptionResolved",
    aggregateType: "GoodsReceiptException",
    aggregateId: exception.id,
    sourceModule: "requisition-to-order",
    correlationId: exception.receiptSession.journey.correlationId,
    actorUserId,
    payload: {
      exceptionId,
      receiptSessionId: exception.receiptSessionId,
      resolution,
    },
  });

  return updated;
}
