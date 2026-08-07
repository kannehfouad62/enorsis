import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function upsertReplenishmentPolicy(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId: string;
  minimumQuantity: number;
  maximumQuantity: number;
  reorderQuantity?: number | null;
  sourceLocationId?: string | null;
  leadTimeDays?: number;
  safetyStockQuantity?: number;
  unitOfMeasure?: string;
}) {
  if (input.minimumQuantity < 0 || input.maximumQuantity <= 0) {
    throw new Error("Min/max quantities must be valid positive values.");
  }

  if (input.minimumQuantity > input.maximumQuantity) {
    throw new Error("Minimum quantity cannot exceed maximum quantity.");
  }

  return prisma.replenishmentPolicy.upsert({
    where: {
      tenantId_inventoryItemId_locationId: {
        tenantId: input.tenantId,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
      },
    },
    create: {
      tenantId: input.tenantId,
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId,
      minimumQuantity: input.minimumQuantity,
      maximumQuantity: input.maximumQuantity,
      reorderQuantity: input.reorderQuantity ?? null,
      sourceLocationId: input.sourceLocationId ?? null,
      leadTimeDays: input.leadTimeDays ?? 0,
      safetyStockQuantity: input.safetyStockQuantity ?? 0,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
    },
    update: {
      minimumQuantity: input.minimumQuantity,
      maximumQuantity: input.maximumQuantity,
      reorderQuantity: input.reorderQuantity ?? null,
      sourceLocationId: input.sourceLocationId ?? null,
      leadTimeDays: input.leadTimeDays ?? 0,
      safetyStockQuantity: input.safetyStockQuantity ?? 0,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      status: "ACTIVE",
    },
  });
}

export async function generateReplenishmentRecommendations(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const policies = await prisma.replenishmentPolicy.findMany({
    where: { tenantId: input.tenantId, status: "ACTIVE" },
  });

  let created = 0;

  for (const policy of policies) {
    const snapshot = await prisma.inventoryAvailabilitySnapshot.findUnique({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: input.tenantId,
          inventoryItemId: policy.inventoryItemId,
          locationId: policy.locationId,
        },
      },
    });

    const current = Number(snapshot?.availableQuantity ?? 0);
    const minimum = Number(policy.minimumQuantity);
    const maximum = Number(policy.maximumQuantity);

    if (current > minimum) continue;

    const openExisting = await prisma.stockReplenishmentRecommendation.count({
      where: {
        tenantId: input.tenantId,
        policyId: policy.id,
        status: { in: ["OPEN", "APPROVED"] },
      },
    });

    if (openExisting > 0) continue;

    const count = await prisma.stockReplenishmentRecommendation.count({
      where: { tenantId: input.tenantId },
    });

    const recommendedQuantity =
      policy.reorderQuantity !== null
        ? Number(policy.reorderQuantity)
        : Math.max(maximum - current, 0);

    await prisma.stockReplenishmentRecommendation.create({
      data: {
        tenantId: input.tenantId,
        policyId: policy.id,
        recommendationNumber: `REP-${new Date().getFullYear()}-${String(
          count + 1,
        ).padStart(6, "0")}`,
        inventoryItemId: policy.inventoryItemId,
        sourceLocationId: policy.sourceLocationId,
        destinationLocationId: policy.locationId,
        currentQuantity: current,
        minimumQuantity: minimum,
        maximumQuantity: maximum,
        recommendedQuantity,
        reason: `Available quantity ${current} is at or below minimum ${minimum}.`,
      },
    });

    created += 1;
  }

  return { created };
}

export async function approveReplenishmentRecommendation(input: {
  recommendationId: string;
  actorUserId: string;
}) {
  const recommendation =
    await prisma.stockReplenishmentRecommendation.findUniqueOrThrow({
      where: { id: input.recommendationId },
    });

  if (recommendation.status !== "OPEN") {
    throw new Error("Only open recommendations can be approved.");
  }

  if (!recommendation.sourceLocationId) {
    throw new Error("A source location is required before stock transfer creation.");
  }

  const source = await prisma.inventoryAvailabilitySnapshot.findUnique({
    where: {
      tenantId_inventoryItemId_locationId: {
        tenantId: recommendation.tenantId,
        inventoryItemId: recommendation.inventoryItemId,
        locationId: recommendation.sourceLocationId,
      },
    },
  });

  const requested = Number(recommendation.recommendedQuantity);
  const available = Number(source?.availableQuantity ?? 0);

  if (available < requested) {
    throw new Error("Source location does not have enough available stock.");
  }

  const count = await prisma.stockTransferOrder.count({
    where: { tenantId: recommendation.tenantId },
  });

  const transfer = await prisma.stockTransferOrder.create({
    data: {
      tenantId: recommendation.tenantId,
      transferNumber: `TRF-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(6, "0")}`,
      inventoryItemId: recommendation.inventoryItemId,
      sourceLocationId: recommendation.sourceLocationId,
      destinationLocationId: recommendation.destinationLocationId,
      requestedQuantity: recommendation.recommendedQuantity,
      unitOfMeasure: "EA",
      recommendationId: recommendation.id,
      requestedByUserId: input.actorUserId,
    },
  });

  await prisma.stockReplenishmentRecommendation.update({
    where: { id: recommendation.id },
    data: {
      status: "TRANSFER_CREATED",
      approvedByUserId: input.actorUserId,
      approvedAt: new Date(),
      stockTransferId: transfer.id,
    },
  });

  return transfer;
}

export async function approveStockTransfer(input: {
  transferId: string;
  actorUserId: string;
}) {
  const transfer = await prisma.stockTransferOrder.findUniqueOrThrow({
    where: { id: input.transferId },
  });

  if (transfer.status !== "DRAFT") {
    throw new Error("Only draft transfers can be approved.");
  }

  return prisma.stockTransferOrder.update({
    where: { id: transfer.id },
    data: {
      status: "APPROVED",
      approvedByUserId: input.actorUserId,
      approvedAt: new Date(),
    },
  });
}

export async function shipStockTransfer(input: {
  transferId: string;
  actorUserId: string;
}) {
  const transfer = await prisma.stockTransferOrder.findUniqueOrThrow({
    where: { id: input.transferId },
    include: { exceptions: true },
  });

  if (transfer.status !== "APPROVED") {
    throw new Error("Transfer must be approved before shipment.");
  }

  const activeExceptions = transfer.exceptions.some((item) =>
    ["OPEN", "INVESTIGATING"].includes(item.status),
  );

  if (activeExceptions) {
    throw new Error("Resolve transfer exceptions before shipment.");
  }

  const source = await prisma.inventoryAvailabilitySnapshot.findUnique({
    where: {
      tenantId_inventoryItemId_locationId: {
        tenantId: transfer.tenantId,
        inventoryItemId: transfer.inventoryItemId,
        locationId: transfer.sourceLocationId,
      },
    },
  });

  const quantity = Number(transfer.requestedQuantity);

  if (Number(source?.availableQuantity ?? 0) < quantity) {
    await prisma.stockTransferException.create({
      data: {
        tenantId: transfer.tenantId,
        stockTransferId: transfer.id,
        exceptionType: "INSUFFICIENT_SOURCE_STOCK",
        severity: "HIGH",
        title: "Insufficient source stock",
        ownerUserId: input.actorUserId,
      },
    });

    await prisma.stockTransferOrder.update({
      where: { id: transfer.id },
      data: { status: "EXCEPTION" },
    });

    throw new Error("Insufficient source inventory for transfer.");
  }

  const movementCount = await prisma.inventoryMovementLedger.count({
    where: { tenantId: transfer.tenantId },
  });

  const outboundMovement = await prisma.$transaction(async (tx) => {
    await tx.inventoryAvailabilitySnapshot.update({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: transfer.tenantId,
          inventoryItemId: transfer.inventoryItemId,
          locationId: transfer.sourceLocationId,
        },
      },
      data: {
        onHandQuantity: { decrement: quantity },
        availableQuantity: { decrement: quantity },
        inTransitQuantity: { increment: quantity },
        lastMovementAt: new Date(),
      },
    });

    const movement = await tx.inventoryMovementLedger.create({
      data: {
        tenantId: transfer.tenantId,
        movementNumber: `INV-MOV-${new Date().getFullYear()}-${String(
          movementCount + 1,
        ).padStart(6, "0")}`,
        movementType: "TRANSFER",
        status: "POSTED",
        inventoryItemId: transfer.inventoryItemId,
        fromLocationId: transfer.sourceLocationId,
        toLocationId: transfer.destinationLocationId,
        quantity,
        unitOfMeasure: transfer.unitOfMeasure,
        referenceType: "STOCK_TRANSFER",
        referenceId: transfer.id,
        postedAt: new Date(),
        postedByUserId: input.actorUserId,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.stockTransferOrder.update({
      where: { id: transfer.id },
      data: {
        status: "IN_TRANSIT",
        shippedQuantity: quantity,
        shippedByUserId: input.actorUserId,
        shippedAt: new Date(),
        outboundMovementId: movement.id,
      },
    });

    return movement;
  });

  await publishDomainEvent({
    tenantId: transfer.tenantId,
    eventType: "Inventory.StockTransferShipped",
    aggregateType: "StockTransferOrder",
    aggregateId: transfer.id,
    sourceModule: "replenishment",
    actorUserId: input.actorUserId,
    payload: {
      transferId: transfer.id,
      transferNumber: transfer.transferNumber,
      inventoryItemId: transfer.inventoryItemId,
      quantity,
    },
  });

  return outboundMovement;
}

export async function receiveStockTransfer(input: {
  transferId: string;
  receivedQuantity: number;
  actorUserId: string;
}) {
  const transfer = await prisma.stockTransferOrder.findUniqueOrThrow({
    where: { id: input.transferId },
  });

  if (transfer.status !== "IN_TRANSIT") {
    throw new Error("Only in-transit transfers can be received.");
  }

  const shipped = Number(transfer.shippedQuantity);
  const received = input.receivedQuantity;

  if (received <= 0) {
    throw new Error("Received quantity must be greater than zero.");
  }

  const movementCount = await prisma.inventoryMovementLedger.count({
    where: { tenantId: transfer.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.inventoryAvailabilitySnapshot.upsert({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: transfer.tenantId,
          inventoryItemId: transfer.inventoryItemId,
          locationId: transfer.destinationLocationId,
        },
      },
      create: {
        tenantId: transfer.tenantId,
        inventoryItemId: transfer.inventoryItemId,
        locationId: transfer.destinationLocationId,
        onHandQuantity: received,
        availableQuantity: received,
        lastMovementAt: new Date(),
      },
      update: {
        onHandQuantity: { increment: received },
        availableQuantity: { increment: received },
        lastMovementAt: new Date(),
      },
    });

    await tx.inventoryAvailabilitySnapshot.update({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: transfer.tenantId,
          inventoryItemId: transfer.inventoryItemId,
          locationId: transfer.sourceLocationId,
        },
      },
      data: {
        inTransitQuantity: { decrement: Math.min(shipped, received) },
      },
    });

    const movement = await tx.inventoryMovementLedger.create({
      data: {
        tenantId: transfer.tenantId,
        movementNumber: `INV-MOV-${new Date().getFullYear()}-${String(
          movementCount + 1,
        ).padStart(6, "0")}`,
        movementType: "RECEIPT",
        status: "POSTED",
        inventoryItemId: transfer.inventoryItemId,
        toLocationId: transfer.destinationLocationId,
        quantity: received,
        unitOfMeasure: transfer.unitOfMeasure,
        referenceType: "STOCK_TRANSFER_RECEIPT",
        referenceId: transfer.id,
        postedAt: new Date(),
        postedByUserId: input.actorUserId,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.stockTransferOrder.update({
      where: { id: transfer.id },
      data: {
        status: received === shipped ? "COMPLETED" : "EXCEPTION",
        receivedQuantity: received,
        receivedByUserId: input.actorUserId,
        receivedAt: new Date(),
        completedAt: received === shipped ? new Date() : null,
        inboundMovementId: movement.id,
      },
    });

    if (received !== shipped) {
      await tx.stockTransferException.create({
        data: {
          tenantId: transfer.tenantId,
          stockTransferId: transfer.id,
          exceptionType: "QUANTITY_VARIANCE",
          severity: "HIGH",
          title: "Transfer receipt quantity variance",
          description: `${received} received of ${shipped} shipped.`,
          ownerUserId: input.actorUserId,
        },
      });
    }
  });

  await recordEnterpriseActivity({
    tenantId: transfer.tenantId,
    activityType: "Inventory.StockTransferReceived",
    sourceModule: "replenishment",
    title: "Stock transfer received",
    description: transfer.transferNumber,
    severity: received === shipped ? "SUCCESS" : "WARNING",
    actorUserId: input.actorUserId,
    subjectType: "StockTransferOrder",
    subjectId: transfer.id,
    subjectLabel: transfer.transferNumber,
    actionUrl: "/app/replenishment",
  });
}
