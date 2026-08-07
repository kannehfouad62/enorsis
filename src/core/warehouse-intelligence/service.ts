import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { dailyAnalyticsPeriod } from "@/core/enterprise-analytics/periods";

const HOUR = 3_600_000;
const DAY = 86_400_000;

function durationHours(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / HOUR);
}

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 100;
}

export async function calculateWarehouseIntelligence(tenantId: string) {
  const now = new Date();
  const lookback = new Date(now.getTime() - 90 * DAY);

  const [
    receivingSessions,
    putawayTasks,
    pickTasks,
    fulfillmentOrders,
    locations,
    transfers,
    discrepancies,
  ] = await Promise.all([
    prisma.warehouseReceivingSession.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.putawayTask.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehousePickTask.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouseFulfillmentOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouseLocationControl.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.stockTransferOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouseDiscrepancy.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const completedReceiving = receivingSessions.filter(
    (session) => session.receivedAt !== null,
  );
  const receivingCycleHours = average(
    completedReceiving
      .map((session) =>
        durationHours(
          session.startedAt ?? session.createdAt,
          session.receivedAt,
        ),
      )
      .filter((value): value is number => value !== null),
  );

  const receivedLineCount = receivingSessions.reduce(
    (sum, session) => sum + session.lines.length,
    0,
  );
  const acceptedQuantity = receivingSessions.reduce(
    (sum, session) =>
      sum +
      session.lines.reduce(
        (lineSum, line) => lineSum + Number(line.acceptedQuantity),
        0,
      ),
    0,
  );
  const receivedQuantity = receivingSessions.reduce(
    (sum, session) =>
      sum +
      session.lines.reduce(
        (lineSum, line) => lineSum + Number(line.receivedQuantity),
        0,
      ),
    0,
  );
  const receivingAcceptanceRate = percentage(
    acceptedQuantity,
    receivedQuantity,
  );

  const completedPutaway = putawayTasks.filter(
    (task) => task.status === "COMPLETED" && task.completedAt !== null,
  );
  const putawayCycleHours = average(
    completedPutaway
      .map((task) =>
        durationHours(task.startedAt ?? task.createdAt, task.completedAt),
      )
      .filter((value): value is number => value !== null),
  );

  const openPutaway = putawayTasks.filter((task) =>
    ["OPEN", "IN_PROGRESS"].includes(task.status),
  );
  const agedPutaway = openPutaway.filter(
    (task) => now.getTime() - task.createdAt.getTime() >= 24 * HOUR,
  );

  const completedPicks = pickTasks.filter((task) =>
    ["PICKED", "SHORT_PICK"].includes(task.status),
  );
  const successfulPicks = pickTasks.filter((task) => task.status === "PICKED");
  const shortPicks = pickTasks.filter((task) => task.status === "SHORT_PICK");
  const pickAccuracy = percentage(successfulPicks.length, completedPicks.length);
  const shortPickRate = percentage(shortPicks.length, completedPicks.length);

  const pickCycleHours = average(
    completedPicks
      .map((task) =>
        durationHours(task.startedAt ?? task.createdAt, task.completedAt),
      )
      .filter((value): value is number => value !== null),
  );

  const completedFulfillment = fulfillmentOrders.filter(
    (order) => order.status === "COMPLETED",
  );
  const fulfillmentCycleHours = average(
    completedFulfillment
      .map((order) =>
        durationHours(order.createdAt, order.completedAt),
      )
      .filter((value): value is number => value !== null),
  );

  const completedTransfers = transfers.filter(
    (transfer) => transfer.status === "COMPLETED",
  );
  const transferCycleHours = average(
    completedTransfers
      .map((transfer) =>
        durationHours(transfer.requestedAt, transfer.completedAt),
      )
      .filter((value): value is number => value !== null),
  );
  const transferReceiptAccuracy = percentage(
    completedTransfers.filter(
      (transfer) =>
        Number(transfer.shippedQuantity) ===
        Number(transfer.receivedQuantity),
    ).length,
    completedTransfers.length,
  );

  const locationRows = locations.map((location) => {
    const capacity =
      location.capacityQuantity !== null
        ? Number(location.capacityQuantity)
        : null;
    const occupied = Number(location.occupiedQuantity);
    const utilization =
      capacity !== null && capacity > 0
        ? (occupied / capacity) * 100
        : null;

    return {
      id: location.id,
      locationId: location.locationId,
      warehouseCode: location.warehouseCode,
      zoneCode: location.zoneCode,
      aisleCode: location.aisleCode,
      binCode: location.binCode,
      status: location.status,
      occupiedQuantity: occupied,
      capacityQuantity: capacity,
      utilizationPercent: utilization,
    };
  });

  const utilizedLocations = locationRows.filter(
    (row) => row.utilizationPercent !== null,
  );
  const averageLocationUtilization = average(
    utilizedLocations
      .map((row) => row.utilizationPercent)
      .filter((value): value is number => value !== null),
  );
  const highUtilizationLocations = utilizedLocations.filter(
    (row) => (row.utilizationPercent ?? 0) >= 90,
  ).length;

  const openDiscrepancies = discrepancies.filter((item) =>
    ["OPEN", "INVESTIGATING"].includes(item.status),
  );

  const throughputQuantity =
    acceptedQuantity +
    completedPutaway.reduce(
      (sum, task) => sum + Number(task.quantity),
      0,
    ) +
    completedPicks.reduce(
      (sum, task) => sum + Number(task.pickedQuantity),
      0,
    );

  const warehouseHealthScore = Math.max(
    0,
    Math.round(
      100 -
        Math.min(shortPickRate, 25) * 1.2 -
        Math.min(openDiscrepancies.length * 3, 18) -
        Math.min(agedPutaway.length * 2, 16) -
        Math.min(highUtilizationLocations * 2, 12),
    ),
  );

  return {
    calculatedAt: now,
    lookbackDays: 90,
    summary: {
      receivingSessions: receivingSessions.length,
      receivedLineCount,
      receivingAcceptanceRate,
      receivingCycleHours,
      openPutawayTasks: openPutaway.length,
      agedPutawayTasks: agedPutaway.length,
      putawayCycleHours,
      pickAccuracy,
      shortPickRate,
      pickCycleHours,
      fulfillmentCycleHours,
      completedFulfillmentOrders: completedFulfillment.length,
      averageLocationUtilization,
      highUtilizationLocations,
      transferCycleHours,
      transferReceiptAccuracy,
      openDiscrepancies: openDiscrepancies.length,
      throughputQuantity,
      warehouseHealthScore,
    },
    locations: locationRows,
    openPutaway: openPutaway.slice(0, 50),
    openDiscrepancies: openDiscrepancies.slice(0, 50),
  };
}

const metricDefinitions = [
  {
    metricKey: "warehouse.intelligence.health_score",
    name: "Warehouse Health Score",
    description:
      "Composite warehouse health across picking, discrepancies, queues and capacity.",
    metricType: "SCORE" as const,
    unit: "score",
    higherIsBetter: true,
  },
  {
    metricKey: "warehouse.intelligence.receiving_acceptance_rate",
    name: "Receiving Acceptance Rate",
    description: "Accepted received quantity divided by total received quantity.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "warehouse.intelligence.receiving_cycle_hours",
    name: "Receiving Cycle Time",
    description: "Average elapsed hours from receiving start to receipt completion.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "warehouse.intelligence.putaway_cycle_hours",
    name: "Putaway Cycle Time",
    description: "Average elapsed hours from putaway task start to completion.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "warehouse.intelligence.pick_accuracy",
    name: "Pick Accuracy",
    description: "Successful picks divided by all completed and short-pick tasks.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "warehouse.intelligence.short_pick_rate",
    name: "Short Pick Rate",
    description: "Short-pick tasks divided by completed picking activity.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: false,
  },
  {
    metricKey: "warehouse.intelligence.fulfillment_cycle_hours",
    name: "Fulfillment Cycle Time",
    description: "Average hours from fulfillment creation through completion.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "warehouse.intelligence.location_utilization",
    name: "Warehouse Location Utilization",
    description: "Average utilization percentage across capacity-managed locations.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: false,
  },
  {
    metricKey: "warehouse.intelligence.transfer_receipt_accuracy",
    name: "Transfer Receipt Accuracy",
    description: "Completed stock transfers received at the shipped quantity.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "warehouse.intelligence.open_discrepancies",
    name: "Open Warehouse Discrepancies",
    description: "Open or investigating warehouse receiving discrepancies.",
    metricType: "COUNT" as const,
    unit: "discrepancies",
    higherIsBetter: false,
  },
];

export async function publishWarehouseIntelligenceMetrics(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const intelligence = await calculateWarehouseIntelligence(input.tenantId);
  const period = dailyAnalyticsPeriod();

  const values = new Map<string, number>([
    [
      "warehouse.intelligence.health_score",
      intelligence.summary.warehouseHealthScore,
    ],
    [
      "warehouse.intelligence.receiving_acceptance_rate",
      intelligence.summary.receivingAcceptanceRate,
    ],
    [
      "warehouse.intelligence.receiving_cycle_hours",
      intelligence.summary.receivingCycleHours,
    ],
    [
      "warehouse.intelligence.putaway_cycle_hours",
      intelligence.summary.putawayCycleHours,
    ],
    [
      "warehouse.intelligence.pick_accuracy",
      intelligence.summary.pickAccuracy,
    ],
    [
      "warehouse.intelligence.short_pick_rate",
      intelligence.summary.shortPickRate,
    ],
    [
      "warehouse.intelligence.fulfillment_cycle_hours",
      intelligence.summary.fulfillmentCycleHours,
    ],
    [
      "warehouse.intelligence.location_utilization",
      intelligence.summary.averageLocationUtilization,
    ],
    [
      "warehouse.intelligence.transfer_receipt_accuracy",
      intelligence.summary.transferReceiptAccuracy,
    ],
    [
      "warehouse.intelligence.open_discrepancies",
      intelligence.summary.openDiscrepancies,
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
          domain: "Warehouse",
          category: "Intelligence",
          metricType: definition.metricType,
          unit: definition.unit,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.3",
          sourceModule: "warehouse-intelligence",
          drilldownPath: "/app/executive/warehouse-intelligence",
          metadata: toJson({
            methodology: "Warehouse operational intelligence",
            lookbackDays: intelligence.lookbackDays,
          }),
        },
        update: {
          name: definition.name,
          description: definition.description,
          metricType: definition.metricType,
          unit: definition.unit,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.3",
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
        dimensions: toJson({
          scope: "enterprise",
          lookbackDays: intelligence.lookbackDays,
        }),
        calculationVersion: "B2.8.3",
        sourceRecordCount:
          intelligence.summary.receivingSessions +
          intelligence.summary.completedFulfillmentOrders,
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
        dimensions: toJson({
          scope: "enterprise",
          lookbackDays: intelligence.lookbackDays,
        }),
        calculationVersion: "B2.8.3",
        sourceRecordCount:
          intelligence.summary.receivingSessions +
          intelligence.summary.completedFulfillmentOrders,
        calculatedAt: new Date(),
      },
    });
  }

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "WarehouseIntelligence.Published",
    aggregateType: "WarehouseIntelligence",
    aggregateId: input.tenantId,
    sourceModule: "warehouse-intelligence",
    actorUserId: input.actorUserId,
    payload: {
      warehouseHealthScore: intelligence.summary.warehouseHealthScore,
      pickAccuracy: intelligence.summary.pickAccuracy,
      shortPickRate: intelligence.summary.shortPickRate,
      openDiscrepancies: intelligence.summary.openDiscrepancies,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "WarehouseIntelligence.Published",
    sourceModule: "warehouse-intelligence",
    title: "Warehouse intelligence refreshed",
    description: `Health score ${intelligence.summary.warehouseHealthScore}`,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "WarehouseIntelligence",
    subjectId: input.tenantId,
    subjectLabel: "Warehouse Intelligence",
    actionUrl: "/app/executive/warehouse-intelligence",
  });

  return intelligence;
}
