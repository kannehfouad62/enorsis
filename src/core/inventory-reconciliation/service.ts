import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function createInventoryCountSession(input: {
  tenantId: string;
  countType?: string | null;
  locationId?: string | null;
  notes?: string | null;
  actorUserId: string;
}) {
  const count = await prisma.inventoryCountSession.count({
    where: { tenantId: input.tenantId },
  });

  const countNumber = `CC-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  return prisma.inventoryCountSession.create({
    data: {
      tenantId: input.tenantId,
      countNumber,
      countType: input.countType ?? null,
      locationId: input.locationId ?? null,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      initiatedByUserId: input.actorUserId,
      notes: input.notes ?? null,
    },
  });
}

export async function recordInventoryCountLine(input: {
  countSessionId: string;
  inventoryItemId: string;
  locationId: string;
  countedQuantity: number;
  unitOfMeasure?: string;
  serialLotReference?: string | null;
  actorUserId: string;
}) {
  const session = await prisma.inventoryCountSession.findUniqueOrThrow({
    where: { id: input.countSessionId },
  });

  if (!["IN_PROGRESS", "DRAFT"].includes(session.status)) {
    throw new Error("Inventory count session is not open for counting.");
  }

  const snapshot = await prisma.inventoryAvailabilitySnapshot.findUnique({
    where: {
      tenantId_inventoryItemId_locationId: {
        tenantId: session.tenantId,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
      },
    },
  });

  const expected = Number(snapshot?.onHandQuantity ?? 0);
  const variance = input.countedQuantity - expected;
  const status = variance === 0 ? "MATCHED" : "VARIANCE";

  const line = await prisma.inventoryCountLine.create({
    data: {
      countSessionId: session.id,
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId,
      expectedQuantity: expected,
      countedQuantity: input.countedQuantity,
      varianceQuantity: variance,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      serialLotReference: input.serialLotReference ?? null,
      status,
      countedByUserId: input.actorUserId,
      countedAt: new Date(),
    },
  });

  if (variance !== 0) {
    const reconciliationCount = await prisma.inventoryReconciliation.count({
      where: { tenantId: session.tenantId },
    });

    await prisma.inventoryReconciliation.create({
      data: {
        tenantId: session.tenantId,
        countSessionId: session.id,
        countLineId: line.id,
        reconciliationNumber: `REC-${new Date().getFullYear()}-${String(
          reconciliationCount + 1,
        ).padStart(6, "0")}`,
        direction: variance > 0 ? "INCREASE" : "DECREASE",
        varianceQuantity: Math.abs(variance),
        reason: "Cycle count variance",
      },
    });

    await prisma.inventoryCountSession.update({
      where: { id: session.id },
      data: { status: "REVIEW_REQUIRED" },
    });
  }

  return line;
}

export async function completeInventoryCountSession(input: {
  countSessionId: string;
  actorUserId: string;
}) {
  const session = await prisma.inventoryCountSession.findUniqueOrThrow({
    where: { id: input.countSessionId },
    include: { reconciliations: true },
  });

  const openReconciliations = session.reconciliations.some((item) =>
    ["OPEN", "REVIEWING"].includes(item.status),
  );

  return prisma.inventoryCountSession.update({
    where: { id: session.id },
    data: {
      status: openReconciliations ? "REVIEW_REQUIRED" : "COUNTED",
      countedAt: new Date(),
    },
  });
}

export async function approveInventoryReconciliation(input: {
  reconciliationId: string;
  reason: string;
  actorUserId: string;
}) {
  const reconciliation =
    await prisma.inventoryReconciliation.findUniqueOrThrow({
      where: { id: input.reconciliationId },
      include: { countLine: true },
    });

  if (!["OPEN", "REVIEWING"].includes(reconciliation.status)) {
    throw new Error("Reconciliation is not available for approval.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: "APPROVED",
        reason: input.reason,
        reviewedByUserId: input.actorUserId,
        approvedByUserId: input.actorUserId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    await tx.inventoryCountLine.update({
      where: { id: reconciliation.countLineId },
      data: { status: "APPROVED" },
    });

    return updated;
  });
}

export async function postInventoryReconciliation(input: {
  reconciliationId: string;
  actorUserId: string;
}) {
  const reconciliation =
    await prisma.inventoryReconciliation.findUniqueOrThrow({
      where: { id: input.reconciliationId },
      include: {
        countSession: true,
        countLine: true,
      },
    });

  if (reconciliation.status !== "APPROVED") {
    throw new Error("Only approved reconciliation records can be posted.");
  }

  const quantity = Number(reconciliation.varianceQuantity);

  const movementCount = await prisma.inventoryMovementLedger.count({
    where: { tenantId: reconciliation.tenantId },
  });

  const movementNumber = `INV-MOV-${new Date().getFullYear()}-${String(
    movementCount + 1,
  ).padStart(6, "0")}`;

  const result = await prisma.$transaction(async (tx) => {
    const snapshot =
      await tx.inventoryAvailabilitySnapshot.findUnique({
        where: {
          tenantId_inventoryItemId_locationId: {
            tenantId: reconciliation.tenantId,
            inventoryItemId: reconciliation.countLine.inventoryItemId,
            locationId: reconciliation.countLine.locationId,
          },
        },
      });

    const movementType =
      reconciliation.direction === "INCREASE"
        ? "ADJUSTMENT_IN"
        : reconciliation.direction === "DECREASE"
          ? "ADJUSTMENT_OUT"
          : "CYCLE_COUNT";

    const movement = await tx.inventoryMovementLedger.create({
      data: {
        tenantId: reconciliation.tenantId,
        movementNumber,
        movementType,
        status: "POSTED",
        inventoryItemId: reconciliation.countLine.inventoryItemId,
        fromLocationId:
          reconciliation.direction === "DECREASE"
            ? reconciliation.countLine.locationId
            : null,
        toLocationId:
          reconciliation.direction === "INCREASE"
            ? reconciliation.countLine.locationId
            : null,
        quantity,
        unitOfMeasure: reconciliation.countLine.unitOfMeasure,
        referenceType: "INVENTORY_RECONCILIATION",
        referenceId: reconciliation.id,
        serialLotReference:
          reconciliation.countLine.serialLotReference,
        reason: reconciliation.reason,
        postedAt: new Date(),
        postedByUserId: input.actorUserId,
        createdByUserId: input.actorUserId,
      },
    });

    if (snapshot) {
      const delta =
        reconciliation.direction === "INCREASE"
          ? quantity
          : reconciliation.direction === "DECREASE"
            ? -quantity
            : 0;

      await tx.inventoryAvailabilitySnapshot.update({
        where: { id: snapshot.id },
        data: {
          onHandQuantity: { increment: delta },
          availableQuantity: { increment: delta },
          lastMovementAt: new Date(),
        },
      });
    } else if (reconciliation.direction === "INCREASE") {
      await tx.inventoryAvailabilitySnapshot.create({
        data: {
          tenantId: reconciliation.tenantId,
          inventoryItemId: reconciliation.countLine.inventoryItemId,
          locationId: reconciliation.countLine.locationId,
          onHandQuantity: quantity,
          availableQuantity: quantity,
          lastMovementAt: new Date(),
        },
      });
    } else {
      throw new Error(
        "Cannot post a decrease adjustment without an existing inventory snapshot.",
      );
    }

    await tx.inventoryReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        movementLedgerId: movement.id,
      },
    });

    await tx.inventoryCountLine.update({
      where: { id: reconciliation.countLineId },
      data: { status: "POSTED" },
    });

    const remaining = await tx.inventoryReconciliation.count({
      where: {
        countSessionId: reconciliation.countSessionId,
        status: { in: ["OPEN", "REVIEWING", "APPROVED"] },
      },
    });

    if (remaining === 0) {
      await tx.inventoryCountSession.update({
        where: { id: reconciliation.countSessionId },
        data: {
          status: "POSTED",
          approvedAt:
            reconciliation.countSession.approvedAt ?? new Date(),
          postedAt: new Date(),
          approvedByUserId:
            reconciliation.countSession.approvedByUserId ??
            input.actorUserId,
        },
      });
    }

    return movement;
  });

  await publishDomainEvent({
    tenantId: reconciliation.tenantId,
    eventType: "Inventory.ReconciliationPosted",
    aggregateType: "InventoryReconciliation",
    aggregateId: reconciliation.id,
    sourceModule: "inventory-reconciliation",
    actorUserId: input.actorUserId,
    payload: {
      reconciliationId: reconciliation.id,
      direction: reconciliation.direction,
      varianceQuantity: reconciliation.varianceQuantity.toString(),
      inventoryItemId: reconciliation.countLine.inventoryItemId,
      locationId: reconciliation.countLine.locationId,
    },
  });

  await recordEnterpriseActivity({
    tenantId: reconciliation.tenantId,
    activityType: "Inventory.ReconciliationPosted",
    sourceModule: "inventory-reconciliation",
    title: "Inventory reconciliation posted",
    description: reconciliation.reconciliationNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "InventoryReconciliation",
    subjectId: reconciliation.id,
    subjectLabel: reconciliation.reconciliationNumber,
    actionUrl: "/app/inventory-reconciliation",
  });

  return result;
}
