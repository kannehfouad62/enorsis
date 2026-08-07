import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { dailyAnalyticsPeriod } from "@/core/enterprise-analytics/periods";

type ClassificationRow = {
  inventoryItemId: string;
  quantityOnHand: number;
  inventoryValue: number;
  annualizedIssueQuantity: number;
  turnoverRatio: number;
  daysInventoryOutstanding: number | null;
  ageDays: number;
  abcClass: "A" | "B" | "C";
  xyzClass: "X" | "Y" | "Z";
  healthScore: number;
};

const DAY = 86_400_000;

function daysBetween(left: Date, right: Date) {
  return Math.max(0, Math.floor((left.getTime() - right.getTime()) / DAY));
}

function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function coefficientOfVariation(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

function xyzClass(values: number[]): "X" | "Y" | "Z" {
  const cv = coefficientOfVariation(values);
  if (cv <= 0.5) return "X";
  if (cv <= 1) return "Y";
  return "Z";
}

function healthScore(input: {
  understock: boolean;
  overstock: boolean;
  deadStock: boolean;
  expired: boolean;
  traceHold: boolean;
  openException: boolean;
}) {
  let score = 100;
  if (input.understock) score -= 20;
  if (input.overstock) score -= 12;
  if (input.deadStock) score -= 22;
  if (input.expired) score -= 25;
  if (input.traceHold) score -= 12;
  if (input.openException) score -= 9;
  return Math.max(0, score);
}

export async function calculateInventoryIntelligence(tenantId: string) {
  const now = new Date();
  const lookback = new Date(now.getTime() - 365 * DAY);
  const variabilityLookback = new Date(now.getTime() - 90 * DAY);

  const [
    availability,
    movements,
    valuation,
    policies,
    traceUnits,
    traceHolds,
    exceptions,
    fulfillmentLines,
  ] = await Promise.all([
    prisma.inventoryAvailabilitySnapshot.findMany({
      where: { tenantId },
    }),
    prisma.inventoryMovementLedger.findMany({
      where: {
        tenantId,
        status: "POSTED",
        occurredAt: { gte: lookback },
      },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.inventoryFinancialValuationSnapshot.findMany({
      where: { tenantId },
    }),
    prisma.replenishmentPolicy.findMany({
      where: { tenantId, status: "ACTIVE" },
    }),
    prisma.inventoryTraceUnit.findMany({
      where: { tenantId },
    }),
    prisma.inventoryTraceHold.findMany({
      where: { tenantId, status: "ACTIVE" },
    }),
    prisma.inventoryOperationException.findMany({
      where: {
        tenantId,
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
    }),
    prisma.warehouseFulfillmentLine.findMany({
      where: {
        fulfillmentOrder: {
          tenantId,
          createdAt: { gte: lookback },
        },
      },
    }),
  ]);

  const valuationByKey = new Map(
    valuation.map((row) => [
      `${row.inventoryItemId}::${row.locationId}`,
      Number(row.inventoryValue),
    ]),
  );

  const policyByKey = new Map(
    policies.map((row) => [
      `${row.inventoryItemId}::${row.locationId}`,
      row,
    ]),
  );

  const traceByItem = new Map<string, typeof traceUnits>();
  for (const unit of traceUnits) {
    const rows = traceByItem.get(unit.inventoryItemId) ?? [];
    rows.push(unit);
    traceByItem.set(unit.inventoryItemId, rows);
  }

  const heldTraceIds = new Set(traceHolds.map((hold) => hold.traceUnitId));

  const openExceptionItems = new Set(
    exceptions
      .map((item) => item.movementLedgerId)
      .filter((id): id is string => Boolean(id)),
  );

  const movementsByItem = new Map<string, typeof movements>();
  for (const movement of movements) {
    const rows = movementsByItem.get(movement.inventoryItemId) ?? [];
    rows.push(movement);
    movementsByItem.set(movement.inventoryItemId, rows);
  }

  const itemTotals = new Map<
    string,
    {
      onHand: number;
      available: number;
      value: number;
      lastMovementAt: Date | null;
      understock: boolean;
      overstock: boolean;
      expired: boolean;
      traceHold: boolean;
      openException: boolean;
    }
  >();

  for (const row of availability) {
    const key = `${row.inventoryItemId}::${row.locationId}`;
    const policy = policyByKey.get(key);
    const current = itemTotals.get(row.inventoryItemId) ?? {
      onHand: 0,
      available: 0,
      value: 0,
      lastMovementAt: null,
      understock: false,
      overstock: false,
      expired: false,
      traceHold: false,
      openException: false,
    };

    current.onHand += Number(row.onHandQuantity);
    current.available += Number(row.availableQuantity);
    current.value += valuationByKey.get(key) ?? 0;

    if (
      row.lastMovementAt &&
      (!current.lastMovementAt || row.lastMovementAt > current.lastMovementAt)
    ) {
      current.lastMovementAt = row.lastMovementAt;
    }

    if (policy) {
      const availableQty = Number(row.availableQuantity);
      current.understock =
        current.understock || availableQty < Number(policy.minimumQuantity);
      current.overstock =
        current.overstock || availableQty > Number(policy.maximumQuantity);
    }

    itemTotals.set(row.inventoryItemId, current);
  }

  for (const [inventoryItemId, total] of itemTotals) {
    const units = traceByItem.get(inventoryItemId) ?? [];
    total.expired = units.some(
      (unit) =>
        unit.status === "EXPIRED" ||
        (unit.expiryDate !== null && unit.expiryDate < now),
    );
    total.traceHold = units.some((unit) => heldTraceIds.has(unit.id));

    const itemMovementIds = new Set(
      (movementsByItem.get(inventoryItemId) ?? []).map((movement) => movement.id),
    );
    total.openException = Array.from(itemMovementIds).some((id) =>
      openExceptionItems.has(id),
    );
  }

  const issuedByItem = new Map<string, number>();
  const monthlyIssueByItem = new Map<string, Map<string, number>>();

  for (const movement of movements) {
    if (!["ISSUE", "ADJUSTMENT_OUT", "SCRAP"].includes(movement.movementType)) {
      continue;
    }

    const quantity = Number(movement.quantity);
    issuedByItem.set(
      movement.inventoryItemId,
      (issuedByItem.get(movement.inventoryItemId) ?? 0) + quantity,
    );

    if (movement.occurredAt >= variabilityLookback) {
      const monthKey = `${movement.occurredAt.getUTCFullYear()}-${String(
        movement.occurredAt.getUTCMonth() + 1,
      ).padStart(2, "0")}`;
      const months = monthlyIssueByItem.get(movement.inventoryItemId) ?? new Map();
      months.set(monthKey, (months.get(monthKey) ?? 0) + quantity);
      monthlyIssueByItem.set(movement.inventoryItemId, months);
    }
  }

  const rankedByValue = Array.from(itemTotals.entries())
    .map(([inventoryItemId, total]) => ({
      inventoryItemId,
      value: total.value,
    }))
    .sort((a, b) => b.value - a.value);

  const totalValue = rankedByValue.reduce((sum, row) => sum + row.value, 0);
  const abcByItem = new Map<string, "A" | "B" | "C">();
  let cumulative = 0;

  for (const row of rankedByValue) {
    cumulative += row.value;
    const share = totalValue > 0 ? cumulative / totalValue : 1;
    abcByItem.set(
      row.inventoryItemId,
      share <= 0.8 ? "A" : share <= 0.95 ? "B" : "C",
    );
  }

  const classification: ClassificationRow[] = Array.from(itemTotals.entries())
    .map(([inventoryItemId, total]) => {
      const annualizedIssueQuantity = issuedByItem.get(inventoryItemId) ?? 0;
      const turnoverRatio = safeRatio(annualizedIssueQuantity, total.onHand);
      const dio = turnoverRatio > 0 ? 365 / turnoverRatio : null;
      const ageDays = total.lastMovementAt
        ? daysBetween(now, total.lastMovementAt)
        : 9999;

      const months = monthlyIssueByItem.get(inventoryItemId);
      const monthValues = months ? Array.from(months.values()) : [];

      return {
        inventoryItemId,
        quantityOnHand: total.onHand,
        inventoryValue: total.value,
        annualizedIssueQuantity,
        turnoverRatio,
        daysInventoryOutstanding: dio,
        ageDays,
        abcClass: abcByItem.get(inventoryItemId) ?? "C",
        xyzClass: xyzClass(monthValues),
        healthScore: healthScore({
          understock: total.understock,
          overstock: total.overstock,
          deadStock: total.onHand > 0 && ageDays >= 180,
          expired: total.expired,
          traceHold: total.traceHold,
          openException: total.openException,
        }),
      };
    })
    .sort((a, b) => b.inventoryValue - a.inventoryValue);

  const totalRequested = fulfillmentLines.reduce(
    (sum, line) => sum + Number(line.requestedQuantity),
    0,
  );
  const totalIssued = fulfillmentLines.reduce(
    (sum, line) => sum + Number(line.issuedQuantity),
    0,
  );
  const fillRate =
    totalRequested > 0 ? (totalIssued / totalRequested) * 100 : 100;

  const totalOnHand = classification.reduce(
    (sum, row) => sum + row.quantityOnHand,
    0,
  );
  const totalFinancialValue = classification.reduce(
    (sum, row) => sum + row.inventoryValue,
    0,
  );
  const totalAnnualIssue = classification.reduce(
    (sum, row) => sum + row.annualizedIssueQuantity,
    0,
  );
  const inventoryTurnover = safeRatio(totalAnnualIssue, totalOnHand);
  const daysInventoryOutstanding =
    inventoryTurnover > 0 ? 365 / inventoryTurnover : null;

  const deadStock = classification.filter(
    (row) => row.quantityOnHand > 0 && row.ageDays >= 180,
  );
  const slowMoving = classification.filter(
    (row) => row.quantityOnHand > 0 && row.ageDays >= 90 && row.ageDays < 180,
  );

  const understockCount = Array.from(itemTotals.values()).filter(
    (row) => row.understock,
  ).length;
  const overstockCount = Array.from(itemTotals.values()).filter(
    (row) => row.overstock,
  ).length;

  const inventoryHealthScore =
    classification.length > 0
      ? Math.round(
          classification.reduce((sum, row) => sum + row.healthScore, 0) /
            classification.length,
        )
      : 100;

  const agingBuckets = [
    { label: "0–30 days", min: 0, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "61–90 days", min: 61, max: 90 },
    { label: "91–180 days", min: 91, max: 180 },
    { label: "181+ days", min: 181, max: Number.POSITIVE_INFINITY },
  ].map((bucket) => {
    const rows = classification.filter(
      (row) => row.ageDays >= bucket.min && row.ageDays <= bucket.max,
    );
    return {
      label: bucket.label,
      itemCount: rows.length,
      quantity: rows.reduce((sum, row) => sum + row.quantityOnHand, 0),
      value: rows.reduce((sum, row) => sum + row.inventoryValue, 0),
    };
  });

  return {
    calculatedAt: now,
    summary: {
      totalOnHand,
      totalFinancialValue,
      inventoryTurnover,
      daysInventoryOutstanding,
      fillRate,
      deadStockItems: deadStock.length,
      slowMovingItems: slowMoving.length,
      understockItems: understockCount,
      overstockItems: overstockCount,
      inventoryHealthScore,
    },
    agingBuckets,
    classification,
  };
}

const metricDefinitions = [
  {
    metricKey: "inventory.intelligence.turnover",
    name: "Inventory Turnover",
    description: "Annualized issued quantity divided by current on-hand quantity.",
    metricType: "RATIO" as const,
    unit: "turns",
    higherIsBetter: true,
  },
  {
    metricKey: "inventory.intelligence.dio",
    name: "Days Inventory Outstanding",
    description: "Estimated inventory days based on quantity turnover.",
    metricType: "DURATION" as const,
    unit: "days",
    higherIsBetter: false,
  },
  {
    metricKey: "inventory.intelligence.fill_rate",
    name: "Inventory Fill Rate",
    description: "Issued fulfillment quantity divided by requested quantity.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "inventory.intelligence.dead_stock",
    name: "Dead Stock Items",
    description: "Items with positive on-hand stock and no movement for 180+ days.",
    metricType: "COUNT" as const,
    unit: "items",
    higherIsBetter: false,
  },
  {
    metricKey: "inventory.intelligence.understock",
    name: "Understock Items",
    description: "Item/location balances below governed replenishment minimums.",
    metricType: "COUNT" as const,
    unit: "items",
    higherIsBetter: false,
  },
  {
    metricKey: "inventory.intelligence.overstock",
    name: "Overstock Items",
    description: "Item/location balances above governed replenishment maximums.",
    metricType: "COUNT" as const,
    unit: "items",
    higherIsBetter: false,
  },
  {
    metricKey: "inventory.intelligence.health_score",
    name: "Inventory Health Score",
    description: "Composite inventory health score across stock, aging, holds and exceptions.",
    metricType: "SCORE" as const,
    unit: "score",
    higherIsBetter: true,
  },
];

export async function publishInventoryIntelligenceMetrics(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const intelligence = await calculateInventoryIntelligence(input.tenantId);
  const period = dailyAnalyticsPeriod();

  const values = new Map<string, number>([
    ["inventory.intelligence.turnover", intelligence.summary.inventoryTurnover],
    [
      "inventory.intelligence.dio",
      intelligence.summary.daysInventoryOutstanding ?? 0,
    ],
    ["inventory.intelligence.fill_rate", intelligence.summary.fillRate],
    ["inventory.intelligence.dead_stock", intelligence.summary.deadStockItems],
    ["inventory.intelligence.understock", intelligence.summary.understockItems],
    ["inventory.intelligence.overstock", intelligence.summary.overstockItems],
    [
      "inventory.intelligence.health_score",
      intelligence.summary.inventoryHealthScore,
    ],
  ]);

  for (const definition of metricDefinitions) {
    const metric =
      await prisma.enterpriseAnalyticsMetricDefinition.upsert({
        where: {
          tenantId_metricKey: {
            tenantId: input.tenantId,
            metricKey: definition.metricKey,
          },
        },
        create: {
          tenantId: input.tenantId,
          metricKey: definition.metricKey,
          name: definition.name,
          description: definition.description,
          domain: "Inventory",
          category: "Intelligence",
          metricType: definition.metricType,
          unit: definition.unit,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.2",
          sourceModule: "inventory-intelligence",
          drilldownPath: "/app/executive/inventory-intelligence",
          metadata: toJson({
            methodology: "Operational inventory intelligence",
          }),
        },
        update: {
          name: definition.name,
          description: definition.description,
          metricType: definition.metricType,
          unit: definition.unit,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.2",
          active: true,
        },
      });

    const value = values.get(definition.metricKey) ?? 0;
    const previous =
      await prisma.enterpriseAnalyticsMetricSnapshot.findFirst({
        where: {
          tenantId: input.tenantId,
          metricDefinitionId: metric.id,
          dimensionKey: "ALL",
          periodStart: { lt: period.periodStart },
        },
        orderBy: { periodStart: "desc" },
      });

    const previousValue =
      previous !== null ? Number(previous.numericValue) : null;

    await prisma.enterpriseAnalyticsMetricSnapshot.upsert({
      where: {
        tenantId_metricDefinitionId_periodType_periodStart_dimensionKey: {
          tenantId: input.tenantId,
          metricDefinitionId: metric.id,
          periodType: period.periodType,
          periodStart: period.periodStart,
          dimensionKey: "ALL",
        },
      },
      create: {
        tenantId: input.tenantId,
        metricDefinitionId: metric.id,
        periodType: period.periodType,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        numericValue: value,
        previousValue,
        trendDirection:
          previousValue === null
            ? "NOT_AVAILABLE"
            : value > previousValue
              ? "UP"
              : value < previousValue
                ? "DOWN"
                : "FLAT",
        healthStatus: "NOT_AVAILABLE",
        dimensionKey: "ALL",
        dimensions: toJson({ scope: "enterprise" }),
        calculationVersion: "B2.8.2",
        sourceRecordCount: intelligence.classification.length,
      },
      update: {
        numericValue: value,
        previousValue,
        trendDirection:
          previousValue === null
            ? "NOT_AVAILABLE"
            : value > previousValue
              ? "UP"
              : value < previousValue
                ? "DOWN"
                : "FLAT",
        dimensions: toJson({ scope: "enterprise" }),
        calculationVersion: "B2.8.2",
        sourceRecordCount: intelligence.classification.length,
        calculatedAt: new Date(),
      },
    });
  }

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "InventoryIntelligence.Published",
    aggregateType: "InventoryIntelligence",
    aggregateId: input.tenantId,
    sourceModule: "inventory-intelligence",
    actorUserId: input.actorUserId,
    payload: {
      calculatedAt: intelligence.calculatedAt.toISOString(),
      inventoryHealthScore: intelligence.summary.inventoryHealthScore,
      deadStockItems: intelligence.summary.deadStockItems,
      understockItems: intelligence.summary.understockItems,
      overstockItems: intelligence.summary.overstockItems,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "InventoryIntelligence.Published",
    sourceModule: "inventory-intelligence",
    title: "Inventory intelligence refreshed",
    description: `Health score ${intelligence.summary.inventoryHealthScore}`,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "InventoryIntelligence",
    subjectId: input.tenantId,
    subjectLabel: "Inventory Intelligence",
    actionUrl: "/app/executive/inventory-intelligence",
  });

  return intelligence;
}
