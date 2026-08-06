import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { transitionRequisitionOrderJourney } from "./service";

type LineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure?: string;
};

export async function createPurchaseOrderExecution(input: {
  journeyId: string;
  supplierId: string;
  contractId?: string | null;
  currencyCode: string;
  lines: LineInput[];
  taxAmount?: number;
  freightAmount?: number;
  discountAmount?: number;
  requestedDeliveryAt?: Date | null;
  actorUserId: string;
}) {
  const journey = await prisma.requisitionOrderJourney.findUniqueOrThrow({
    where: { id: input.journeyId },
    include: { approvalRoutes: { where: { status: "APPROVED" }, take: 1 } },
  });

  if (!["APPROVED", "ORDER_PENDING"].includes(journey.status)) {
    throw new Error("Journey must be approved before PO generation.");
  }
  if (journey.approvalRoutes.length === 0) {
    throw new Error("No approved requisition approval route was found.");
  }

  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const tax = input.taxAmount ?? 0;
  const freight = input.freightAmount ?? 0;
  const discount = input.discountAmount ?? 0;
  const total = subtotal + tax + freight - discount;
  const count = await prisma.purchaseOrderExecution.count({
    where: { tenantId: journey.tenantId },
  });
  const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const execution = await prisma.purchaseOrderExecution.create({
    data: {
      tenantId: journey.tenantId,
      journeyId: journey.id,
      orderNumber,
      supplierId: input.supplierId,
      contractId: input.contractId ?? null,
      currencyCode: input.currencyCode,
      totalAmount: total,
      taxAmount: tax,
      freightAmount: freight,
      discountAmount: discount,
      requestedDeliveryAt: input.requestedDeliveryAt ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      revisions: {
        create: {
          revisionNumber: 1,
          supplierId: input.supplierId,
          contractId: input.contractId ?? null,
          currencyCode: input.currencyCode,
          subtotalAmount: subtotal,
          taxAmount: tax,
          freightAmount: freight,
          discountAmount: discount,
          totalAmount: total,
          requestedDeliveryAt: input.requestedDeliveryAt ?? null,
          lineSnapshot: toJson(input.lines),
          changeSummary: toJson({ createdFromJourney: journey.journeyNumber }),
          createdByUserId: input.actorUserId,
        },
      },
    },
  });

  await prisma.requisitionOrderJourney.update({
    where: { id: journey.id },
    data: {
      status: "ORDER_PENDING",
      supplierId: input.supplierId,
      committedAmount: total,
      milestones: {
        create: {
          milestoneType: "ORDER_CREATED",
          title: "Purchase order created",
          description: orderNumber,
          actorUserId: input.actorUserId,
          sourceModule: "requisition-to-order",
          sourceRecordId: execution.id,
        },
      },
    },
  });

  await publishDomainEvent({
    tenantId: journey.tenantId,
    eventType: "PurchaseOrder.ExecutionCreated",
    aggregateType: "PurchaseOrderExecution",
    aggregateId: execution.id,
    sourceModule: "requisition-to-order",
    correlationId: journey.correlationId,
    actorUserId: input.actorUserId,
    payload: { executionId: execution.id, orderNumber, total },
  });

  return execution;
}

export async function validatePurchaseOrderExecution(executionId: string) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: executionId },
  });
  const revision = await prisma.purchaseOrderRevision.findUniqueOrThrow({
    where: {
      executionId_revisionNumber: {
        executionId,
        revisionNumber: execution.currentRevision,
      },
    },
  });

  const lines = Array.isArray(revision.lineSnapshot)
    ? revision.lineSnapshot
    : [];
  const checks = [
    {
      key: "supplier.present",
      name: "Supplier selected",
      status: execution.supplierId ? "PASS" : "FAIL",
      releaseBlocking: true,
      observedValue: execution.supplierId || "MISSING",
      expectedValue: "Supplier selected",
      remediation: execution.supplierId ? null : "Select an approved supplier.",
    },
    {
      key: "amount.positive",
      name: "Order total is positive",
      status: Number(execution.totalAmount) > 0 ? "PASS" : "FAIL",
      releaseBlocking: true,
      observedValue: execution.totalAmount.toString(),
      expectedValue: "Greater than 0",
      remediation: Number(execution.totalAmount) > 0 ? null : "Add valid pricing.",
    },
    {
      key: "lines.present",
      name: "Order contains lines",
      status: lines.length > 0 ? "PASS" : "FAIL",
      releaseBlocking: true,
      observedValue: String(lines.length),
      expectedValue: "At least 1",
      remediation: lines.length > 0 ? null : "Add at least one line.",
    },
  ] as const;

  await prisma.purchaseOrderValidation.deleteMany({
    where: { executionId, revisionNumber: execution.currentRevision },
  });
  await prisma.purchaseOrderValidation.createMany({
    data: checks.map((check) => ({
      executionId,
      revisionNumber: execution.currentRevision,
      key: check.key,
      name: check.name,
      status: check.status,
      releaseBlocking: check.releaseBlocking,
      observedValue: check.observedValue,
      expectedValue: check.expectedValue,
      remediation: check.remediation,
    })),
  });

  const blocked = checks.some(
    (check) => check.status === "FAIL" && check.releaseBlocking,
  );
  return prisma.purchaseOrderExecution.update({
    where: { id: executionId },
    data: { status: blocked ? "VALIDATION_FAILED" : "READY_TO_ISSUE" },
  });
}

export async function issuePurchaseOrderExecution(input: {
  executionId: string;
  actorUserId: string;
}) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: input.executionId },
    include: { journey: true },
  });
  if (execution.status !== "READY_TO_ISSUE") {
    throw new Error("Purchase order must pass validation before issue.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.purchaseOrderExecution.update({
      where: { id: execution.id },
      data: { status: "ISSUED", issuedAt: now, updatedByUserId: input.actorUserId },
    }),
    prisma.purchaseOrderRevision.update({
      where: {
        executionId_revisionNumber: {
          executionId: execution.id,
          revisionNumber: execution.currentRevision,
        },
      },
      data: { status: "ISSUED", issuedAt: now },
    }),
  ]);

  await transitionRequisitionOrderJourney({
    journeyId: execution.journeyId,
    status: "ORDER_ISSUED",
    actorUserId: input.actorUserId,
    description: `${execution.orderNumber} was issued.`,
  });

  await recordEnterpriseActivity({
    tenantId: execution.tenantId,
    activityType: "PurchaseOrder.Issued",
    sourceModule: "requisition-to-order",
    title: "Purchase order issued",
    description: execution.orderNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "PurchaseOrderExecution",
    subjectId: execution.id,
    subjectLabel: execution.orderNumber,
    actionUrl: "/app/requisition-to-order/purchase-orders",
    correlationId: execution.journey.correlationId,
  });
}

export async function acknowledgePurchaseOrderExecution(input: {
  executionId: string;
  actorUserId: string;
}) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: input.executionId },
  });
  if (execution.status !== "ISSUED") {
    throw new Error("Only issued purchase orders can be acknowledged.");
  }
  return prisma.purchaseOrderExecution.update({
    where: { id: execution.id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      updatedByUserId: input.actorUserId,
    },
  });
}

export async function createPurchaseOrderRevision(input: {
  executionId: string;
  reason: string;
  supplierId: string;
  currencyCode: string;
  lines: LineInput[];
  actorUserId: string;
}) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: input.executionId },
  });
  const revisionNumber = execution.currentRevision + 1;
  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  return prisma.$transaction(async (tx) => {
    await tx.purchaseOrderRevision.updateMany({
      where: { executionId: execution.id, status: { in: ["DRAFT", "ISSUED"] } },
      data: { status: "SUPERSEDED" },
    });
    const revision = await tx.purchaseOrderRevision.create({
      data: {
        executionId: execution.id,
        revisionNumber,
        reason: input.reason,
        supplierId: input.supplierId,
        currencyCode: input.currencyCode,
        subtotalAmount: subtotal,
        totalAmount: subtotal,
        lineSnapshot: toJson(input.lines),
        changeSummary: toJson({ reason: input.reason }),
        createdByUserId: input.actorUserId,
      },
    });
    await tx.purchaseOrderExecution.update({
      where: { id: execution.id },
      data: {
        currentRevision: revisionNumber,
        status: "DRAFT",
        supplierId: input.supplierId,
        currencyCode: input.currencyCode,
        totalAmount: subtotal,
        updatedByUserId: input.actorUserId,
      },
    });
    return revision;
  });
}
