import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function upsertInventoryValuationPolicy(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId?: string | null;
  costMethod:
    | "FIFO"
    | "WEIGHTED_AVERAGE"
    | "STANDARD"
    | "SPECIFIC_IDENTIFICATION";
  standardUnitCost?: number | null;
  currencyCode?: string;
}) {
  const existing = await prisma.inventoryFinancialValuationPolicy.findFirst({
    where: {
      tenantId: input.tenantId,
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId ?? null,
      active: true,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (existing) {
    return prisma.inventoryFinancialValuationPolicy.update({
      where: { id: existing.id },
      data: {
        costMethod: input.costMethod,
        standardUnitCost: input.standardUnitCost ?? null,
        currencyCode: input.currencyCode ?? "USD",
      },
    });
  }

  return prisma.inventoryFinancialValuationPolicy.create({
    data: {
      tenantId: input.tenantId,
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId ?? null,
      costMethod: input.costMethod,
      standardUnitCost: input.standardUnitCost ?? null,
      currencyCode: input.currencyCode ?? "USD",
    },
  });
}

export async function createCostLayerFromMovement(input: {
  movementId: string;
  actorUserId: string;
}) {
  const movement = await prisma.inventoryMovementLedger.findUniqueOrThrow({
    where: { id: input.movementId },
  });

  if (movement.status !== "POSTED") {
    throw new Error("Only posted inventory movements can create cost layers.");
  }

  if (!["RECEIPT", "ADJUSTMENT_IN", "RETURN"].includes(movement.movementType)) {
    throw new Error("Only inbound inventory movements create cost layers.");
  }

  if (!movement.toLocationId) {
    throw new Error("Inbound movement must have a destination location.");
  }

  const policy =
    (await prisma.inventoryFinancialValuationPolicy.findFirst({
      where: {
        tenantId: movement.tenantId,
        inventoryItemId: movement.inventoryItemId,
        OR: [
          { locationId: movement.toLocationId },
          { locationId: null },
        ],
        active: true,
      },
      orderBy: { effectiveFrom: "desc" },
    })) ??
    (await prisma.inventoryFinancialValuationPolicy.create({
      data: {
        tenantId: movement.tenantId,
        inventoryItemId: movement.inventoryItemId,
        locationId: movement.toLocationId,
        costMethod: "WEIGHTED_AVERAGE",
        currencyCode: movement.currencyCode,
      },
    }));

  const quantity = Number(movement.quantity);
  const unitCost =
    movement.unitCost !== null
      ? Number(movement.unitCost)
      : policy.standardUnitCost !== null
        ? Number(policy.standardUnitCost)
        : 0;

  const count = await prisma.inventoryFinancialCostLayer.count({
    where: { tenantId: movement.tenantId },
  });

  const existing = await prisma.inventoryFinancialCostLayer.findFirst({
    where: { sourceMovementId: movement.id },
  });

  if (existing) return existing;

  const layer = await prisma.inventoryFinancialCostLayer.create({
    data: {
      tenantId: movement.tenantId,
      policyId: policy.id,
      inventoryItemId: movement.inventoryItemId,
      locationId: movement.toLocationId,
      sourceMovementId: movement.id,
      layerNumber: `COST-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(7, "0")}`,
      originalQuantity: quantity,
      remainingQuantity: quantity,
      unitCost,
      currencyCode: movement.currencyCode,
      extendedCost: quantity * unitCost,
      receivedAt: movement.postedAt ?? movement.occurredAt,
    },
  });

  await refreshInventoryFinancialValuation({
    tenantId: movement.tenantId,
    inventoryItemId: movement.inventoryItemId,
    locationId: movement.toLocationId,
  });

  await publishDomainEvent({
    tenantId: movement.tenantId,
    eventType: "InventoryFinancial.CostLayerCreated",
    aggregateType: "InventoryFinancialCostLayer",
    aggregateId: layer.id,
    sourceModule: "inventory-financial-valuation",
    actorUserId: input.actorUserId,
    payload: {
      costLayerId: layer.id,
      sourceMovementId: movement.id,
      inventoryItemId: movement.inventoryItemId,
      locationId: movement.toLocationId,
      quantity,
      unitCost,
    },
  });

  return layer;
}

export async function refreshInventoryFinancialValuation(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId: string;
}) {
  const [snapshot, layers] = await Promise.all([
    prisma.inventoryAvailabilitySnapshot.findUnique({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: input.tenantId,
          inventoryItemId: input.inventoryItemId,
          locationId: input.locationId,
        },
      },
    }),
    prisma.inventoryFinancialCostLayer.findMany({
      where: {
        tenantId: input.tenantId,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
        status: { in: ["OPEN", "PARTIALLY_CONSUMED"] },
      },
    }),
  ]);

  const quantityOnHand = Number(snapshot?.onHandQuantity ?? 0);
  const remainingLayerQuantity = layers.reduce(
    (sum, layer) => sum + Number(layer.remainingQuantity),
    0,
  );
  const totalLayerValue = layers.reduce(
    (sum, layer) =>
      sum + Number(layer.remainingQuantity) * Number(layer.unitCost),
    0,
  );

  const averageUnitCost =
    remainingLayerQuantity > 0
      ? totalLayerValue / remainingLayerQuantity
      : 0;

  const inventoryValue = quantityOnHand * averageUnitCost;
  const currencyCode = layers[0]?.currencyCode ?? "USD";

  return prisma.inventoryFinancialValuationSnapshot.upsert({
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
      quantityOnHand,
      averageUnitCost,
      inventoryValue,
      currencyCode,
      asOf: new Date(),
    },
    update: {
      quantityOnHand,
      averageUnitCost,
      inventoryValue,
      currencyCode,
      asOf: new Date(),
    },
  });
}

export async function createInventoryFinancialReconciliation(input: {
  tenantId: string;
  inventoryItemId: string;
  locationId: string;
  expectedValue: number;
  reason?: string | null;
}) {
  const valuation =
    await prisma.inventoryFinancialValuationSnapshot.findUnique({
      where: {
        tenantId_inventoryItemId_locationId: {
          tenantId: input.tenantId,
          inventoryItemId: input.inventoryItemId,
          locationId: input.locationId,
        },
      },
    });

  const ledgerValue = Number(valuation?.inventoryValue ?? 0);
  const quantityOnHand = Number(valuation?.quantityOnHand ?? 0);
  const varianceValue = ledgerValue - input.expectedValue;

  const count = await prisma.inventoryFinancialReconciliation.count({
    where: { tenantId: input.tenantId },
  });

  return prisma.inventoryFinancialReconciliation.create({
    data: {
      tenantId: input.tenantId,
      reconciliationNumber: `FIN-REC-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(6, "0")}`,
      status:
        Math.abs(varianceValue) < 0.000001
          ? "BALANCED"
          : "REVIEW_REQUIRED",
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId,
      quantityOnHand,
      ledgerValue,
      expectedValue: input.expectedValue,
      varianceValue,
      currencyCode: valuation?.currencyCode ?? "USD",
      reason: input.reason ?? null,
    },
  });
}

export async function approveInventoryFinancialReconciliation(input: {
  reconciliationId: string;
  actorUserId: string;
}) {
  const reconciliation =
    await prisma.inventoryFinancialReconciliation.findUniqueOrThrow({
      where: { id: input.reconciliationId },
    });

  if (
    !["BALANCED", "REVIEW_REQUIRED", "DRAFT"].includes(
      reconciliation.status,
    )
  ) {
    throw new Error("Financial reconciliation is not available for approval.");
  }

  const updated =
    await prisma.inventoryFinancialReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: "APPROVED",
        reviewedByUserId: input.actorUserId,
        approvedByUserId: input.actorUserId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

  await recordEnterpriseActivity({
    tenantId: reconciliation.tenantId,
    activityType: "InventoryFinancial.ReconciliationApproved",
    sourceModule: "inventory-financial-valuation",
    title: "Inventory financial reconciliation approved",
    description: reconciliation.reconciliationNumber,
    severity:
      Number(reconciliation.varianceValue) === 0 ? "SUCCESS" : "WARNING",
    actorUserId: input.actorUserId,
    subjectType: "InventoryFinancialReconciliation",
    subjectId: reconciliation.id,
    subjectLabel: reconciliation.reconciliationNumber,
    actionUrl: "/app/inventory-financial-valuation",
  });

  return updated;
}
