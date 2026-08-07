import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function createInventoryTraceUnit(input: {
  tenantId: string;
  unitType: "LOT" | "SERIAL";
  inventoryItemId: string;
  lotNumber?: string | null;
  serialNumber?: string | null;
  currentLocationId?: string | null;
  quantity?: number;
  unitOfMeasure?: string;
  manufactureDate?: Date | null;
  receivedDate?: Date | null;
  expiryDate?: Date | null;
  supplierId?: string | null;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  notes?: string | null;
  actorUserId: string;
}) {
  if (input.unitType === "SERIAL" && !input.serialNumber) {
    throw new Error("Serial-controlled inventory requires a serial number.");
  }

  if (input.unitType === "LOT" && !input.lotNumber) {
    throw new Error("Lot-controlled inventory requires a lot number.");
  }

  const count = await prisma.inventoryTraceUnit.count({
    where: { tenantId: input.tenantId },
  });

  const traceNumber = `TRC-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(7, "0")}`;

  const status =
    input.expiryDate && input.expiryDate.getTime() < Date.now()
      ? "EXPIRED"
      : "ACTIVE";

  const unit = await prisma.inventoryTraceUnit.create({
    data: {
      tenantId: input.tenantId,
      traceNumber,
      unitType: input.unitType,
      status,
      inventoryItemId: input.inventoryItemId,
      lotNumber: input.lotNumber ?? null,
      serialNumber: input.serialNumber ?? null,
      currentLocationId: input.currentLocationId ?? null,
      quantity: input.unitType === "SERIAL" ? 1 : input.quantity ?? 1,
      unitOfMeasure: input.unitOfMeasure ?? "EA",
      manufactureDate: input.manufactureDate ?? null,
      receivedDate: input.receivedDate ?? new Date(),
      expiryDate: input.expiryDate ?? null,
      supplierId: input.supplierId ?? null,
      sourceReferenceType: input.sourceReferenceType ?? null,
      sourceReferenceId: input.sourceReferenceId ?? null,
      notes: input.notes ?? null,
      events: {
        create: {
          tenantId: input.tenantId,
          eventType: "CREATED",
          toLocationId: input.currentLocationId ?? null,
          quantity: input.unitType === "SERIAL" ? 1 : input.quantity ?? 1,
          actorUserId: input.actorUserId,
          referenceType: input.sourceReferenceType ?? null,
          referenceId: input.sourceReferenceId ?? null,
        },
      },
    },
    include: { events: true },
  });

  if (status === "EXPIRED") {
    await prisma.inventoryTraceHold.create({
      data: {
        tenantId: input.tenantId,
        traceUnitId: unit.id,
        holdType: "EXPIRY",
        title: "Expired inventory hold",
        description: "Trace unit was created with an expiry date in the past.",
        ownerUserId: input.actorUserId,
      },
    });
  }

  return unit;
}

export async function recordInventoryTraceEvent(input: {
  traceUnitId: string;
  eventType:
    | "RECEIVED"
    | "PUTAWAY"
    | "TRANSFERRED"
    | "RESERVED"
    | "PICKED"
    | "ISSUED"
    | "ADJUSTED"
    | "QUARANTINED"
    | "RELEASED"
    | "RECALLED"
    | "EXPIRED"
    | "SCRAPPED"
    | "COUNTED";
  movementLedgerId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity?: number | null;
  notes?: string | null;
  actorUserId: string;
}) {
  const traceUnit = await prisma.inventoryTraceUnit.findUniqueOrThrow({
    where: { id: input.traceUnitId },
    include: { holds: true },
  });

  const blockingHold = traceUnit.holds.some(
    (hold) => hold.status === "ACTIVE",
  );

  if (
    blockingHold &&
    ["PICKED", "ISSUED", "TRANSFERRED"].includes(input.eventType)
  ) {
    throw new Error("Active traceability hold blocks movement or issue.");
  }

  const nextStatus =
    input.eventType === "QUARANTINED"
      ? "QUARANTINED"
      : input.eventType === "RECALLED"
        ? "RECALLED"
        : input.eventType === "EXPIRED"
          ? "EXPIRED"
          : input.eventType === "SCRAPPED"
            ? "SCRAPPED"
            : input.eventType === "ISSUED" &&
                traceUnit.unitType === "SERIAL"
              ? "CONSUMED"
              : undefined;

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.inventoryTraceEvent.create({
      data: {
        tenantId: traceUnit.tenantId,
        traceUnitId: traceUnit.id,
        eventType: input.eventType,
        movementLedgerId: input.movementLedgerId ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        fromLocationId: input.fromLocationId ?? null,
        toLocationId: input.toLocationId ?? null,
        quantity: input.quantity ?? null,
        actorUserId: input.actorUserId,
        notes: input.notes ?? null,
      },
    });

    await tx.inventoryTraceUnit.update({
      where: { id: traceUnit.id },
      data: {
        currentLocationId:
          input.toLocationId ??
          (input.eventType === "ISSUED" ? null : traceUnit.currentLocationId),
        status: nextStatus,
      },
    });

    if (
      ["QUARANTINED", "RECALLED", "EXPIRED"].includes(input.eventType)
    ) {
      const holdType =
        input.eventType === "QUARANTINED"
          ? "QUALITY"
          : input.eventType === "RECALLED"
            ? "RECALL"
            : "EXPIRY";

      const existing = await tx.inventoryTraceHold.count({
        where: {
          traceUnitId: traceUnit.id,
          holdType,
          status: "ACTIVE",
        },
      });

      if (existing === 0) {
        await tx.inventoryTraceHold.create({
          data: {
            tenantId: traceUnit.tenantId,
            traceUnitId: traceUnit.id,
            holdType,
            title: `${input.eventType} traceability hold`,
            description: input.notes ?? null,
            ownerUserId: input.actorUserId,
          },
        });
      }
    }

    return created;
  });

  await publishDomainEvent({
    tenantId: traceUnit.tenantId,
    eventType: `InventoryTrace.${input.eventType}`,
    aggregateType: "InventoryTraceUnit",
    aggregateId: traceUnit.id,
    sourceModule: "inventory-traceability",
    actorUserId: input.actorUserId,
    payload: {
      traceUnitId: traceUnit.id,
      traceNumber: traceUnit.traceNumber,
      eventType: input.eventType,
      movementLedgerId: input.movementLedgerId ?? null,
      referenceId: input.referenceId ?? null,
    },
  });

  return event;
}

export async function releaseInventoryTraceHold(input: {
  holdId: string;
  releaseReason: string;
  actorUserId: string;
}) {
  const hold = await prisma.inventoryTraceHold.findUniqueOrThrow({
    where: { id: input.holdId },
    include: { traceUnit: true },
  });

  const updated = await prisma.inventoryTraceHold.update({
    where: { id: hold.id },
    data: {
      status: "RELEASED",
      releasedByUserId: input.actorUserId,
      releasedAt: new Date(),
      releaseReason: input.releaseReason,
    },
  });

  const activeHolds = await prisma.inventoryTraceHold.count({
    where: {
      traceUnitId: hold.traceUnitId,
      status: "ACTIVE",
    },
  });

  if (activeHolds === 0 && hold.traceUnit.status === "QUARANTINED") {
    await prisma.inventoryTraceUnit.update({
      where: { id: hold.traceUnitId },
      data: { status: "ACTIVE" },
    });
  }

  await recordEnterpriseActivity({
    tenantId: hold.tenantId,
    activityType: "InventoryTrace.HoldReleased",
    sourceModule: "inventory-traceability",
    title: "Inventory traceability hold released",
    description: hold.traceUnit.traceNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "InventoryTraceUnit",
    subjectId: hold.traceUnitId,
    subjectLabel: hold.traceUnit.traceNumber,
    actionUrl: "/app/inventory-traceability",
  });

  return updated;
}

export async function markExpiredTraceUnits(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const expired = await prisma.inventoryTraceUnit.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      expiryDate: {
        lt: new Date(),
      },
    },
  });

  for (const unit of expired) {
    await recordInventoryTraceEvent({
      traceUnitId: unit.id,
      eventType: "EXPIRED",
      notes: "Automatically marked expired based on expiry date.",
      actorUserId: input.actorUserId,
    });
  }

  return { expiredCount: expired.length };
}
