import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function createWarehouseFulfillmentOrder(input: {
  tenantId: string;
  requestType?: string | null;
  requestId?: string | null;
  destinationType?: string | null;
  destinationId?: string | null;
  neededAt?: Date | null;
  notes?: string | null;
  actorUserId: string;
  line: {
    lineReference: string;
    inventoryItemId: string;
    sourceLocationId: string;
    requestedQuantity: number;
    unitOfMeasure?: string;
    serialLotReference?: string | null;
  };
}) {
  if (input.line.requestedQuantity <= 0) {
    throw new Error("Requested quantity must be greater than zero.");
  }

  const count = await prisma.warehouseFulfillmentOrder.count({
    where: { tenantId: input.tenantId },
  });
  const fulfillmentNumber = `WH-FUL-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  return prisma.warehouseFulfillmentOrder.create({
    data: {
      tenantId: input.tenantId,
      fulfillmentNumber,
      requestType: input.requestType ?? null,
      requestId: input.requestId ?? null,
      requestedByUserId: input.actorUserId,
      destinationType: input.destinationType ?? null,
      destinationId: input.destinationId ?? null,
      neededAt: input.neededAt ?? null,
      notes: input.notes ?? null,
      lines: {
        create: {
          lineReference: input.line.lineReference,
          inventoryItemId: input.line.inventoryItemId,
          sourceLocationId: input.line.sourceLocationId,
          requestedQuantity: input.line.requestedQuantity,
          unitOfMeasure: input.line.unitOfMeasure ?? "EA",
          serialLotReference: input.line.serialLotReference ?? null,
        },
      },
    },
    include: { lines: true },
  });
}

export async function allocateWarehouseFulfillmentOrder(input: {
  fulfillmentOrderId: string;
  actorUserId: string;
}) {
  const order = await prisma.warehouseFulfillmentOrder.findUniqueOrThrow({
    where: { id: input.fulfillmentOrderId },
    include: { lines: true },
  });

  if (order.status !== "DRAFT") {
    throw new Error("Only draft fulfillment orders can be allocated.");
  }

  for (const line of order.lines) {
    const snapshot =
      await prisma.inventoryAvailabilitySnapshot.findUnique({
        where: {
          tenantId_inventoryItemId_locationId: {
            tenantId: order.tenantId,
            inventoryItemId: line.inventoryItemId,
            locationId: line.sourceLocationId,
          },
        },
      });

    const available = Number(snapshot?.availableQuantity ?? 0);
    const requested = Number(line.requestedQuantity);

    if (available < requested) {
      await prisma.warehouseFulfillmentException.create({
        data: {
          tenantId: order.tenantId,
          fulfillmentOrderId: order.id,
          fulfillmentLineId: line.id,
          exceptionType: "INSUFFICIENT_STOCK",
          severity: "HIGH",
          title: "Insufficient inventory for allocation",
          description: `${available} available, ${requested} requested.`,
          ownerUserId: input.actorUserId,
        },
      });

      await prisma.warehouseFulfillmentOrder.update({
        where: { id: order.id },
        data: { status: "EXCEPTION" },
      });

      throw new Error("Fulfillment allocation blocked by insufficient stock.");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const snapshot =
        await tx.inventoryAvailabilitySnapshot.findUniqueOrThrow({
          where: {
            tenantId_inventoryItemId_locationId: {
              tenantId: order.tenantId,
              inventoryItemId: line.inventoryItemId,
              locationId: line.sourceLocationId,
            },
          },
        });

      await tx.inventoryAvailabilitySnapshot.update({
        where: { id: snapshot.id },
        data: {
          reservedQuantity: {
            increment: line.requestedQuantity,
          },
          availableQuantity: {
            decrement: line.requestedQuantity,
          },
        },
      });

      await tx.warehouseFulfillmentLine.update({
        where: { id: line.id },
        data: {
          allocatedQuantity: line.requestedQuantity,
        },
      });

      const taskCount = await tx.warehousePickTask.count({
        where: { tenantId: order.tenantId },
      });

      await tx.warehousePickTask.create({
        data: {
          tenantId: order.tenantId,
          taskNumber: `PICK-${new Date().getFullYear()}-${String(
            taskCount + 1,
          ).padStart(6, "0")}`,
          fulfillmentOrderId: order.id,
          fulfillmentLineId: line.id,
          inventoryItemId: line.inventoryItemId,
          sourceLocationId: line.sourceLocationId,
          requestedQuantity: line.requestedQuantity,
          unitOfMeasure: line.unitOfMeasure,
          assignedUserId: input.actorUserId,
        },
      });
    }

    await tx.warehouseFulfillmentOrder.update({
      where: { id: order.id },
      data: {
        status: "ALLOCATED",
        allocatedAt: new Date(),
      },
    });
  });

  return prisma.warehouseFulfillmentOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { lines: true, pickTasks: true },
  });
}

export async function completeWarehousePickTask(input: {
  pickTaskId: string;
  pickedQuantity: number;
  actorUserId: string;
}) {
  const task = await prisma.warehousePickTask.findUniqueOrThrow({
    where: { id: input.pickTaskId },
    include: {
      fulfillmentOrder: true,
      fulfillmentLine: true,
    },
  });

  if (!["OPEN", "IN_PROGRESS"].includes(task.status)) {
    throw new Error("Only open pick tasks can be completed.");
  }

  if (input.pickedQuantity < 0) {
    throw new Error("Picked quantity cannot be negative.");
  }

  const requested = Number(task.requestedQuantity);
  const shortPick = input.pickedQuantity < requested;

  await prisma.$transaction(async (tx) => {
    await tx.warehousePickTask.update({
      where: { id: task.id },
      data: {
        status: shortPick ? "SHORT_PICK" : "PICKED",
        pickedQuantity: input.pickedQuantity,
        startedAt: task.startedAt ?? new Date(),
        completedAt: new Date(),
      },
    });

    await tx.warehouseFulfillmentLine.update({
      where: { id: task.fulfillmentLineId },
      data: {
        pickedQuantity: input.pickedQuantity,
      },
    });

    if (shortPick) {
      const unpicked = requested - input.pickedQuantity;

      await tx.inventoryAvailabilitySnapshot.update({
        where: {
          tenantId_inventoryItemId_locationId: {
            tenantId: task.tenantId,
            inventoryItemId: task.inventoryItemId,
            locationId: task.sourceLocationId,
          },
        },
        data: {
          reservedQuantity: { decrement: unpicked },
          availableQuantity: { increment: unpicked },
        },
      });

      await tx.warehouseFulfillmentException.create({
        data: {
          tenantId: task.tenantId,
          fulfillmentOrderId: task.fulfillmentOrderId,
          fulfillmentLineId: task.fulfillmentLineId,
          exceptionType: "SHORT_PICK",
          severity: "HIGH",
          title: "Short pick recorded",
          description: `${input.pickedQuantity} picked of ${requested} requested.`,
          ownerUserId: input.actorUserId,
        },
      });
    }

    const remaining = await tx.warehousePickTask.count({
      where: {
        fulfillmentOrderId: task.fulfillmentOrderId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    await tx.warehouseFulfillmentOrder.update({
      where: { id: task.fulfillmentOrderId },
      data: {
        status:
          remaining === 0
            ? shortPick
              ? "EXCEPTION"
              : "PICKED"
            : "PICKING",
        pickedAt: remaining === 0 ? new Date() : undefined,
      },
    });
  });

  return prisma.warehousePickTask.findUniqueOrThrow({
    where: { id: task.id },
  });
}

export async function packWarehouseFulfillmentOrder(input: {
  fulfillmentOrderId: string;
  packageType?: string | null;
  grossWeight?: number | null;
  weightUnit?: string | null;
  carrierReference?: string | null;
  trackingReference?: string | null;
  actorUserId: string;
}) {
  const order = await prisma.warehouseFulfillmentOrder.findUniqueOrThrow({
    where: { id: input.fulfillmentOrderId },
    include: {
      exceptions: true,
      pickTasks: true,
    },
  });

  if (order.status !== "PICKED") {
    throw new Error("Fulfillment order must be fully picked before packing.");
  }

  const openExceptions = order.exceptions.some((item) =>
    ["OPEN", "INVESTIGATING"].includes(item.status),
  );

  if (openExceptions) {
    throw new Error("Resolve fulfillment exceptions before packing.");
  }

  const count = await prisma.warehousePackage.count({
    where: { tenantId: order.tenantId },
  });

  const packageNumber = `PKG-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const packageRecord = await prisma.warehousePackage.create({
    data: {
      tenantId: order.tenantId,
      packageNumber,
      fulfillmentOrderId: order.id,
      status: "PACKED",
      packageType: input.packageType ?? null,
      grossWeight: input.grossWeight ?? null,
      weightUnit: input.weightUnit ?? null,
      carrierReference: input.carrierReference ?? null,
      trackingReference: input.trackingReference ?? null,
      packedByUserId: input.actorUserId,
      packedAt: new Date(),
    },
  });

  await prisma.warehouseFulfillmentOrder.update({
    where: { id: order.id },
    data: {
      status: "PACKED",
      packedAt: new Date(),
    },
  });

  return packageRecord;
}

export async function issueWarehouseFulfillmentOrder(input: {
  fulfillmentOrderId: string;
  actorUserId: string;
}) {
  const order = await prisma.warehouseFulfillmentOrder.findUniqueOrThrow({
    where: { id: input.fulfillmentOrderId },
    include: {
      lines: true,
      packages: true,
      exceptions: true,
    },
  });

  if (order.status !== "PACKED") {
    throw new Error("Fulfillment order must be packed before issue.");
  }

  if (order.packages.length === 0) {
    throw new Error("At least one package is required before issue.");
  }

  if (
    order.exceptions.some((item) =>
      ["OPEN", "INVESTIGATING"].includes(item.status),
    )
  ) {
    throw new Error("Open fulfillment exceptions block issue.");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const quantity = Number(line.pickedQuantity);

      const snapshot =
        await tx.inventoryAvailabilitySnapshot.findUniqueOrThrow({
          where: {
            tenantId_inventoryItemId_locationId: {
              tenantId: order.tenantId,
              inventoryItemId: line.inventoryItemId,
              locationId: line.sourceLocationId,
            },
          },
        });

      await tx.inventoryAvailabilitySnapshot.update({
        where: { id: snapshot.id },
        data: {
          onHandQuantity: { decrement: quantity },
          reservedQuantity: { decrement: quantity },
          lastMovementAt: new Date(),
        },
      });

      const movementCount = await tx.inventoryMovementLedger.count({
        where: { tenantId: order.tenantId },
      });

      await tx.inventoryMovementLedger.create({
        data: {
          tenantId: order.tenantId,
          movementNumber: `INV-MOV-${new Date().getFullYear()}-${String(
            movementCount + 1,
          ).padStart(6, "0")}`,
          movementType: "ISSUE",
          status: "POSTED",
          inventoryItemId: line.inventoryItemId,
          fromLocationId: line.sourceLocationId,
          quantity,
          unitOfMeasure: line.unitOfMeasure,
          referenceType: "WAREHOUSE_FULFILLMENT",
          referenceId: order.id,
          serialLotReference: line.serialLotReference,
          postedAt: new Date(),
          postedByUserId: input.actorUserId,
          createdByUserId: input.actorUserId,
        },
      });

      await tx.warehouseFulfillmentLine.update({
        where: { id: line.id },
        data: {
          issuedQuantity: quantity,
        },
      });
    }

    await tx.warehouseFulfillmentOrder.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        issuedAt: new Date(),
        completedAt: new Date(),
      },
    });
  });

  await publishDomainEvent({
    tenantId: order.tenantId,
    eventType: "Warehouse.FulfillmentIssued",
    aggregateType: "WarehouseFulfillmentOrder",
    aggregateId: order.id,
    sourceModule: "warehouse-fulfillment",
    actorUserId: input.actorUserId,
    payload: {
      fulfillmentOrderId: order.id,
      fulfillmentNumber: order.fulfillmentNumber,
      requestType: order.requestType,
      requestId: order.requestId,
    },
  });

  await recordEnterpriseActivity({
    tenantId: order.tenantId,
    activityType: "Warehouse.FulfillmentIssued",
    sourceModule: "warehouse-fulfillment",
    title: "Warehouse fulfillment issued",
    description: order.fulfillmentNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "WarehouseFulfillmentOrder",
    subjectId: order.id,
    subjectLabel: order.fulfillmentNumber,
    actionUrl: "/app/warehouse-fulfillment",
  });

  return prisma.warehouseFulfillmentOrder.findUniqueOrThrow({
    where: { id: order.id },
  });
}

export async function resolveWarehouseFulfillmentException(input: {
  exceptionId: string;
  resolution: string;
  actorUserId: string;
}) {
  const exception =
    await prisma.warehouseFulfillmentException.findUniqueOrThrow({
      where: { id: input.exceptionId },
    });

  const updated = await prisma.warehouseFulfillmentException.update({
    where: { id: input.exceptionId },
    data: {
      status: "RESOLVED",
      resolution: input.resolution,
      resolvedAt: new Date(),
      ownerUserId: input.actorUserId,
    },
  });

  const remaining = await prisma.warehouseFulfillmentException.count({
    where: {
      fulfillmentOrderId: exception.fulfillmentOrderId,
      status: { in: ["OPEN", "INVESTIGATING"] },
    },
  });

  if (remaining === 0) {
    const openPicks = await prisma.warehousePickTask.count({
      where: {
        fulfillmentOrderId: exception.fulfillmentOrderId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    await prisma.warehouseFulfillmentOrder.update({
      where: { id: exception.fulfillmentOrderId },
      data: {
        status: openPicks === 0 ? "PICKED" : "PICKING",
      },
    });
  }

  return updated;
}
