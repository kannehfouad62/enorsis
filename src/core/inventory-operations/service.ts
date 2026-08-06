import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

async function getSnapshot(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId: string;
}) {
  return prisma.inventoryAvailabilitySnapshot.upsert({
    where: {
      tenantId_inventoryItemId_locationId: {
        tenantId: input.tenantId,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
      },
    },
    create: {
      ...input,
      onHandQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      inTransitQuantity: 0,
      damagedQuantity: 0,
    },
    update: {},
  });
}

export async function createInventoryMovement(input: {
  tenantId: string;
  movementType:
    | "RECEIPT"
    | "ISSUE"
    | "TRANSFER"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "RETURN"
    | "SCRAP"
    | "CYCLE_COUNT";
  inventoryItemId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity: number;
  unitOfMeasure?: string;
  unitCost?: number | null;
  currencyCode?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  serialLotReference?: string | null;
  reason?: string | null;
  actorUserId: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Inventory movement quantity must be greater than zero.");
  }

  const count = await prisma.inventoryMovementLedger.count({
    where: { tenantId: input.tenantId },
  });

  const movementNumber = `INV-MOV-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  return prisma.inventoryMovementLedger.create({
    data: {
      tenantId: input.tenantId,
      movementNumber,
      movementType: input.movementType,
      inventoryItemId: input.inventoryItemId,
      fromLocationId: input.fromLocationId ?? null,
      toLocationId: input.toLocationId ?? null,
      quantity: input.quantity,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      unitCost: input.unitCost ?? null,
      currencyCode: input.currencyCode ?? "USD",
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      serialLotReference: input.serialLotReference ?? null,
      reason: input.reason ?? null,
      createdByUserId: input.actorUserId,
    },
  });
}

export async function postInventoryMovement(input: {
  movementId: string;
  actorUserId: string;
}) {
  const movement = await prisma.inventoryMovementLedger.findUniqueOrThrow({
    where: { id: input.movementId },
  });

  if (movement.status !== "DRAFT") {
    throw new Error("Only draft inventory movements can be posted.");
  }

  const quantity = Number(movement.quantity);

  if (
    ["ISSUE", "TRANSFER", "ADJUSTMENT_OUT", "SCRAP"].includes(
      movement.movementType,
    ) &&
    !movement.fromLocationId
  ) {
    throw new Error("A source location is required.");
  }

  if (
    ["RECEIPT", "TRANSFER", "ADJUSTMENT_IN", "RETURN"].includes(
      movement.movementType,
    ) &&
    !movement.toLocationId
  ) {
    throw new Error("A destination location is required.");
  }

  if (movement.fromLocationId) {
    const source = await getSnapshot({
      tenantId: movement.tenantId,
      inventoryItemId: movement.inventoryItemId,
      locationId: movement.fromLocationId,
    });

    if (Number(source.availableQuantity) < quantity) {
      await prisma.inventoryOperationException.create({
        data: {
          tenantId: movement.tenantId,
          movementLedgerId: movement.id,
          exceptionType: "INSUFFICIENT_AVAILABILITY",
          severity: "HIGH",
          title: "Insufficient available inventory",
          description: `${source.availableQuantity.toString()} available, ${quantity} requested.`,
          ownerUserId: input.actorUserId,
        },
      });

      throw new Error("Inventory movement blocked by insufficient availability.");
    }
  }

  await prisma.$transaction(async (tx) => {
    if (movement.fromLocationId) {
      const source = await tx.inventoryAvailabilitySnapshot.findUniqueOrThrow({
        where: {
          tenantId_inventoryItemId_locationId: {
            tenantId: movement.tenantId,
            inventoryItemId: movement.inventoryItemId,
            locationId: movement.fromLocationId,
          },
        },
      });

      await tx.inventoryAvailabilitySnapshot.update({
        where: { id: source.id },
        data: {
          onHandQuantity: { decrement: quantity },
          availableQuantity: { decrement: quantity },
          lastMovementAt: new Date(),
        },
      });
    }

    if (movement.toLocationId) {
      await tx.inventoryAvailabilitySnapshot.upsert({
        where: {
          tenantId_inventoryItemId_locationId: {
            tenantId: movement.tenantId,
            inventoryItemId: movement.inventoryItemId,
            locationId: movement.toLocationId,
          },
        },
        create: {
          tenantId: movement.tenantId,
          inventoryItemId: movement.inventoryItemId,
          locationId: movement.toLocationId,
          onHandQuantity: quantity,
          availableQuantity: quantity,
          lastMovementAt: new Date(),
        },
        update: {
          onHandQuantity: { increment: quantity },
          availableQuantity: { increment: quantity },
          lastMovementAt: new Date(),
        },
      });
    }

    await tx.inventoryMovementLedger.update({
      where: { id: movement.id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        postedByUserId: input.actorUserId,
      },
    });
  });

  await publishDomainEvent({
    tenantId: movement.tenantId,
    eventType: "Inventory.MovementPosted",
    aggregateType: "InventoryMovementLedger",
    aggregateId: movement.id,
    sourceModule: "inventory-operations",
    actorUserId: input.actorUserId,
    payload: {
      movementId: movement.id,
      movementNumber: movement.movementNumber,
      movementType: movement.movementType,
      inventoryItemId: movement.inventoryItemId,
      quantity,
    },
  });

  await recordEnterpriseActivity({
    tenantId: movement.tenantId,
    activityType: "Inventory.MovementPosted",
    sourceModule: "inventory-operations",
    title: "Inventory movement posted",
    description: movement.movementNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "InventoryMovementLedger",
    subjectId: movement.id,
    subjectLabel: movement.movementNumber,
    actionUrl: "/app/inventory-operations",
  });

  return prisma.inventoryMovementLedger.findUniqueOrThrow({
    where: { id: movement.id },
    include: { exceptions: true },
  });
}

export async function createInventoryReservation(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId: string;
  requestedQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  actorUserId: string;
}) {
  const snapshot = await getSnapshot({
    tenantId: input.tenantId,
    inventoryItemId: input.inventoryItemId,
    locationId: input.locationId,
  });

  if (Number(snapshot.availableQuantity) < input.requestedQuantity) {
    throw new Error("Insufficient availability for reservation.");
  }

  const count = await prisma.inventoryReservation.count({
    where: { tenantId: input.tenantId },
  });

  const reservationNumber = `INV-RES-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.create({
      data: {
        tenantId: input.tenantId,
        reservationNumber,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
        requestedQuantity: input.requestedQuantity,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        requestedByUserId: input.actorUserId,
      },
    });

    await tx.inventoryAvailabilitySnapshot.update({
      where: { id: snapshot.id },
      data: {
        reservedQuantity: { increment: input.requestedQuantity },
        availableQuantity: { decrement: input.requestedQuantity },
      },
    });

    return reservation;
  });
}

export async function resolveInventoryOperationException(input: {
  exceptionId: string;
  resolution: string;
  actorUserId: string;
}) {
  return prisma.inventoryOperationException.update({
    where: { id: input.exceptionId },
    data: {
      status: "RESOLVED",
      resolution: input.resolution,
      resolvedAt: new Date(),
      ownerUserId: input.actorUserId,
    },
  });
}
