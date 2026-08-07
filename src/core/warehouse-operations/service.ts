import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function createWarehouseReceivingSession(input: {
  tenantId: string;
  sourceType?: string | null;
  sourceId?: string | null;
  purchaseOrderId?: string | null;
  goodsReceiptSessionId?: string | null;
  supplierId?: string | null;
  dockLocationId?: string | null;
  carrierReference?: string | null;
  deliveryReference?: string | null;
  actorUserId: string;
  line: {
    lineReference: string;
    inventoryItemId: string;
    description: string;
    expectedQuantity: number;
    receivedQuantity: number;
    unitOfMeasure?: string;
    condition?: "RECEIVED" | "DAMAGED" | "REJECTED" | "QUARANTINED";
    serialLotReference?: string | null;
  };
}) {
  const count = await prisma.warehouseReceivingSession.count({
    where: { tenantId: input.tenantId },
  });

  const receivingNumber = `WH-RCV-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const received = input.line.receivedQuantity;
  const expected = input.line.expectedQuantity;
  const condition = input.line.condition ?? "RECEIVED";

  const lineStatus =
    condition === "DAMAGED"
      ? "DAMAGED"
      : condition === "REJECTED"
        ? "REJECTED"
        : condition === "QUARANTINED"
          ? "QUARANTINED"
          : received < expected
            ? "SHORT"
            : received > expected
              ? "OVER"
              : "RECEIVED";

  const accepted =
    ["RECEIVED", "SHORT", "OVER"].includes(lineStatus) ? received : 0;

  const session = await prisma.warehouseReceivingSession.create({
    data: {
      tenantId: input.tenantId,
      receivingNumber,
      status: "RECEIVED",
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      purchaseOrderId: input.purchaseOrderId ?? null,
      goodsReceiptSessionId: input.goodsReceiptSessionId ?? null,
      supplierId: input.supplierId ?? null,
      dockLocationId: input.dockLocationId ?? null,
      carrierReference: input.carrierReference ?? null,
      deliveryReference: input.deliveryReference ?? null,
      receivedByUserId: input.actorUserId,
      startedAt: new Date(),
      receivedAt: new Date(),
      lines: {
        create: {
          lineReference: input.line.lineReference,
          inventoryItemId: input.line.inventoryItemId,
          description: input.line.description,
          expectedQuantity: expected,
          receivedQuantity: received,
          acceptedQuantity: accepted,
          rejectedQuantity: lineStatus === "REJECTED" ? received : 0,
          damagedQuantity: lineStatus === "DAMAGED" ? received : 0,
          unitOfMeasure: input.line.unitOfMeasure ?? "EA",
          status: lineStatus,
          serialLotReference: input.line.serialLotReference ?? null,
        },
      },
    },
    include: { lines: true },
  });

  const line = session.lines[0];
  const discrepancyType =
    lineStatus === "SHORT"
      ? "SHORT_RECEIPT"
      : lineStatus === "OVER"
        ? "OVER_RECEIPT"
        : lineStatus === "DAMAGED"
          ? "DAMAGED_GOODS"
          : lineStatus === "QUARANTINED"
            ? "QUARANTINE_REQUIRED"
            : null;

  if (discrepancyType && line) {
    await prisma.warehouseDiscrepancy.create({
      data: {
        tenantId: input.tenantId,
        receivingSessionId: session.id,
        receiptLineId: line.id,
        discrepancyType,
        severity:
          discrepancyType === "QUARANTINE_REQUIRED" ? "CRITICAL" : "HIGH",
        title: `${discrepancyType.replaceAll("_", " ")} detected`,
        description: `${received} received against ${expected} expected.`,
        ownerUserId: input.actorUserId,
      },
    });
  }

  return session;
}

export async function configureWarehouseLocation(input: {
  tenantId: string;
  locationId: string;
  warehouseCode?: string | null;
  zoneCode?: string | null;
  aisleCode?: string | null;
  binCode?: string | null;
  capacityQuantity?: number | null;
  unitOfMeasure?: string;
  allowsMixedItems?: boolean;
  requiresLot?: boolean;
  requiresSerial?: boolean;
  quarantineOnly?: boolean;
}) {
  return prisma.warehouseLocationControl.upsert({
    where: {
      tenantId_locationId: {
        tenantId: input.tenantId,
        locationId: input.locationId,
      },
    },
    create: {
      tenantId: input.tenantId,
      locationId: input.locationId,
      warehouseCode: input.warehouseCode ?? null,
      zoneCode: input.zoneCode ?? null,
      aisleCode: input.aisleCode ?? null,
      binCode: input.binCode ?? null,
      capacityQuantity: input.capacityQuantity ?? null,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      allowsMixedItems: input.allowsMixedItems ?? true,
      requiresLot: input.requiresLot ?? false,
      requiresSerial: input.requiresSerial ?? false,
      quarantineOnly: input.quarantineOnly ?? false,
    },
    update: {
      warehouseCode: input.warehouseCode ?? null,
      zoneCode: input.zoneCode ?? null,
      aisleCode: input.aisleCode ?? null,
      binCode: input.binCode ?? null,
      capacityQuantity: input.capacityQuantity ?? null,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      allowsMixedItems: input.allowsMixedItems ?? true,
      requiresLot: input.requiresLot ?? false,
      requiresSerial: input.requiresSerial ?? false,
      quarantineOnly: input.quarantineOnly ?? false,
    },
  });
}

export async function createPutawayTask(input: {
  receivingSessionId: string;
  receiptLineId: string;
  destinationControlId: string;
  quantity: number;
  actorUserId: string;
}) {
  const [session, line, location] = await Promise.all([
    prisma.warehouseReceivingSession.findUniqueOrThrow({
      where: { id: input.receivingSessionId },
    }),
    prisma.warehouseReceiptLine.findUniqueOrThrow({
      where: { id: input.receiptLineId },
    }),
    prisma.warehouseLocationControl.findUniqueOrThrow({
      where: { id: input.destinationControlId },
    }),
  ]);

  if (session.tenantId !== location.tenantId) {
    throw new Error("Receiving session and destination location tenant mismatch.");
  }

  if (location.status !== "ACTIVE") {
    throw new Error("Destination location is not active.");
  }

  if (
    location.capacityQuantity &&
    Number(location.occupiedQuantity) + input.quantity >
      Number(location.capacityQuantity)
  ) {
    await prisma.warehouseDiscrepancy.create({
      data: {
        tenantId: session.tenantId,
        receivingSessionId: session.id,
        receiptLineId: line.id,
        discrepancyType: "CAPACITY_EXCEEDED",
        severity: "HIGH",
        title: "Destination capacity exceeded",
        ownerUserId: input.actorUserId,
      },
    });
    throw new Error("Destination location capacity would be exceeded.");
  }

  if (location.requiresLot && !line.serialLotReference) {
    throw new Error("Destination location requires a lot reference.");
  }

  const count = await prisma.putawayTask.count({
    where: { tenantId: session.tenantId },
  });

  const taskNumber = `PUT-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  return prisma.putawayTask.create({
    data: {
      tenantId: session.tenantId,
      taskNumber,
      receivingSessionId: session.id,
      receiptLineId: line.id,
      destinationControlId: location.id,
      inventoryItemId: line.inventoryItemId,
      quantity: input.quantity,
      unitOfMeasure: line.unitOfMeasure,
      assignedUserId: input.actorUserId,
    },
  });
}

export async function completePutawayTask(input: {
  taskId: string;
  actorUserId: string;
}) {
  const task = await prisma.putawayTask.findUniqueOrThrow({
    where: { id: input.taskId },
    include: {
      receivingSession: true,
      receiptLine: true,
      destinationControl: true,
    },
  });

  if (!["OPEN", "IN_PROGRESS"].includes(task.status)) {
    throw new Error("Only open or in-progress putaway tasks can be completed.");
  }

  const movementCount = await prisma.inventoryMovementLedger.count({
    where: { tenantId: task.tenantId },
  });
  const movementNumber = `INV-MOV-${new Date().getFullYear()}-${String(
    movementCount + 1,
  ).padStart(6, "0")}`;

  const updatedTask = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovementLedger.create({
      data: {
        tenantId: task.tenantId,
        movementNumber,
        movementType: "RECEIPT",
        status: "POSTED",
        inventoryItemId: task.inventoryItemId,
        toLocationId: task.destinationControl.locationId,
        quantity: task.quantity,
        unitOfMeasure: task.unitOfMeasure,
        referenceType: "WAREHOUSE_RECEIVING",
        referenceId: task.receivingSessionId,
        serialLotReference: task.receiptLine.serialLotReference,
        postedAt: new Date(),
        postedByUserId: input.actorUserId,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.inventoryAvailabilitySnapshot.upsert({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: task.tenantId,
          inventoryItemId: task.inventoryItemId,
          locationId: task.destinationControl.locationId,
        },
      },
      create: {
        tenantId: task.tenantId,
        inventoryItemId: task.inventoryItemId,
        locationId: task.destinationControl.locationId,
        onHandQuantity: task.quantity,
        availableQuantity: task.quantity,
        lastMovementAt: new Date(),
      },
      update: {
        onHandQuantity: { increment: task.quantity },
        availableQuantity: { increment: task.quantity },
        lastMovementAt: new Date(),
      },
    });

    await tx.warehouseLocationControl.update({
      where: { id: task.destinationControlId },
      data: {
        occupiedQuantity: { increment: task.quantity },
      },
    });

    return tx.putawayTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        startedAt: task.startedAt ?? new Date(),
        completedAt: new Date(),
        movementLedgerId: movement.id,
      },
    });
  });

  await publishDomainEvent({
    tenantId: task.tenantId,
    eventType: "Warehouse.PutawayCompleted",
    aggregateType: "PutawayTask",
    aggregateId: task.id,
    sourceModule: "warehouse-operations",
    actorUserId: input.actorUserId,
    payload: {
      taskId: task.id,
      taskNumber: task.taskNumber,
      inventoryItemId: task.inventoryItemId,
      quantity: task.quantity.toString(),
      destinationLocationId: task.destinationControl.locationId,
    },
  });

  await recordEnterpriseActivity({
    tenantId: task.tenantId,
    activityType: "Warehouse.PutawayCompleted",
    sourceModule: "warehouse-operations",
    title: "Warehouse putaway completed",
    description: task.taskNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "PutawayTask",
    subjectId: task.id,
    subjectLabel: task.taskNumber,
    actionUrl: "/app/warehouse-operations",
  });

  return updatedTask;
}

export async function resolveWarehouseDiscrepancy(input: {
  discrepancyId: string;
  resolution: string;
  actorUserId: string;
}) {
  return prisma.warehouseDiscrepancy.update({
    where: { id: input.discrepancyId },
    data: {
      status: "RESOLVED",
      resolution: input.resolution,
      resolvedAt: new Date(),
      ownerUserId: input.actorUserId,
    },
  });
}
