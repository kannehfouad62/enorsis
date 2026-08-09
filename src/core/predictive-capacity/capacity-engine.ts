import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateMultiEngineControlledConfidence, MULTI_ENGINE_DECISION_PATHS } from "@/core/ai-runtime/multi-engine-adoption";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

const round = (value: number, digits = 2) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

function level(utilization: number) {
  if (utilization >= 115) return "CRITICAL";
  if (utilization >= 100) return "HIGH";
  if (utilization >= 85) return "MEDIUM";
  return "LOW";
}

function recommendation(utilization: number, gap: number) {
  if (utilization >= 115) return "EXPAND_OR_REDISTRIBUTE_CAPACITY";
  if (utilization >= 100) return "REBALANCE_AND_CONTROL_INBOUND";
  if (utilization >= 85) return "PREPARE_CAPACITY_ACTION";
  if (gap > 0) return "MONITOR_HEADROOM";
  return "CAPACITY_HEALTHY";
}

type Allocation = {
  currentUnits: number;
  projectedDemandUnits: number;
  projectedInboundUnits: number;
  itemIds: Set<string>;
};

export async function generatePredictiveCapacityPlan(input: {
  tenantId: string;
  createdByUserId: string;
  horizonDays: number;
  targetHeadroomPct: number;
}) {
  const [locations, balances, latestInventoryRun] =
    await Promise.all([
      prisma.inventoryLocation.findMany({
        where: {
          tenantId: input.tenantId,
          status: "ACTIVE",
        },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryBalance.findMany({
        where: {
          item: {
            tenantId: input.tenantId,
            status: "ACTIVE",
          },
        },
        include: {
          item: true,
          location: true,
        },
      }),
      prisma.predictiveInventoryOptimizationRun.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { generatedAt: "desc" },
      }),
    ]);

  const optimizationSignals = latestInventoryRun
    ? await prisma.predictiveInventoryOptimizationSignal.findMany({
        where: {
          tenantId: input.tenantId,
          optimizationRunId: latestInventoryRun.id,
        },
      })
    : [];

  const optimizationByItem = new Map(
    optimizationSignals.map((signal) => [
      signal.inventoryItemId,
      signal,
    ]),
  );

  const itemTotals = new Map<string, number>();
  for (const balance of balances) {
    itemTotals.set(
      balance.item.id,
      (itemTotals.get(balance.item.id) ?? 0) +
        Math.max(0, num(balance.quantityOnHand)),
    );
  }

  const run = await prisma.predictiveCapacityPlanningRun.create({
    data: {
      tenantId: input.tenantId,
      createdByUserId: input.createdByUserId,
      horizonDays: input.horizonDays,
      targetHeadroomPct: input.targetHeadroomPct,
      assumptions: {
        capacityBasis:
          "Inventory-unit operating capacity proxy; not physical cubic/weight capacity.",
        locationAllocation:
          "Projected demand and inbound are allocated by each location's current share of item on-hand inventory.",
        operatingCapacityProxy:
          "Current units divided by (1 - target headroom percentage).",
        projectedEndingUnits:
          "current units + projected inbound - projected demand, floored at zero.",
        note:
          "Add physical volume, weight and location master capacities in a later warehouse-master-data enhancement for true cubic capacity planning.",
      },
    },
  });

  const byLocation = new Map<string, Allocation>();

  for (const location of locations) {
    byLocation.set(location.id, {
      currentUnits: 0,
      projectedDemandUnits: 0,
      projectedInboundUnits: 0,
      itemIds: new Set(),
    });
  }

  for (const balance of balances) {
    const locationId = balance.location.id;
    const allocation = byLocation.get(locationId);
    if (!allocation) continue;

    const current = Math.max(0, num(balance.quantityOnHand));
    const itemTotal = itemTotals.get(balance.item.id) ?? 0;
    const share =
      itemTotal > 0 ? current / itemTotal : 0;

    const prediction = optimizationByItem.get(balance.item.id);
    const demand = prediction
      ? num(prediction.horizonDemand)
      : 0;
    const inbound = prediction
      ? num(prediction.suggestedReorderQty)
      : 0;

    allocation.currentUnits += current;
    allocation.projectedDemandUnits += demand * share;
    allocation.projectedInboundUnits += inbound * share;
    allocation.itemIds.add(balance.item.id);
  }

  const signals: Array<{
    tenantId: string;
    capacityRunId: string;
    scopeType: string;
    scopeKey: string;
    scopeLabel: string;
    currentUnits: number;
    projectedDemandUnits: number;
    projectedInboundUnits: number;
    projectedEndingUnits: number;
    operatingCapacityProxy: number;
    currentUtilizationPct: number;
    projectedUtilizationPct: number;
    capacityGapUnits: number;
    pressureScore: number;
    riskLevel: string;
    recommendation: string;
    confidence: number;
    evidence: Prisma.InputJsonValue;
  }> = [];

  const headroomFraction = clamp(
    input.targetHeadroomPct,
    5,
    50,
  ) / 100;

  for (const location of locations) {
    const allocation = byLocation.get(location.id);
    if (!allocation) continue;

    const current = allocation.currentUnits;
    const proxyCapacity =
      current > 0
        ? current / Math.max(0.1, 1 - headroomFraction)
        : Math.max(
            1,
            allocation.projectedInboundUnits,
            allocation.projectedDemandUnits,
          );

    const projectedEnding = Math.max(
      0,
      current +
        allocation.projectedInboundUnits -
        allocation.projectedDemandUnits,
    );

    const currentUtilization =
      (current / proxyCapacity) * 100;
    const projectedUtilization =
      (projectedEnding / proxyCapacity) * 100;
    const gap = Math.max(
      0,
      projectedEnding - proxyCapacity,
    );

    const pressure = clamp(
      projectedUtilization * 0.8 +
        Math.max(
          0,
          projectedUtilization - currentUtilization,
        ) *
          0.2,
      0,
      150,
    );

    const confidence = clamp(
      55 +
        Math.min(20, allocation.itemIds.size * 2) +
        (latestInventoryRun ? 15 : 0),
      45,
      95,
    );

    signals.push({
      tenantId: input.tenantId,
      capacityRunId: run.id,
      scopeType: "LOCATION",
      scopeKey: location.id,
      scopeLabel: location.name,
      currentUnits: round(current, 4),
      projectedDemandUnits: round(
        allocation.projectedDemandUnits,
        4,
      ),
      projectedInboundUnits: round(
        allocation.projectedInboundUnits,
        4,
      ),
      projectedEndingUnits: round(
        projectedEnding,
        4,
      ),
      operatingCapacityProxy: round(
        proxyCapacity,
        4,
      ),
      currentUtilizationPct: round(
        currentUtilization,
        2,
      ),
      projectedUtilizationPct: round(
        projectedUtilization,
        2,
      ),
      capacityGapUnits: round(gap, 4),
      pressureScore: round(pressure, 2),
      riskLevel: level(projectedUtilization),
      recommendation: recommendation(
        projectedUtilization,
        gap,
      ),
      confidence: round(confidence, 2),
      evidence: {
        itemCount: allocation.itemIds.size,
        targetHeadroomPct: input.targetHeadroomPct,
        optimizationRunId: latestInventoryRun?.id ?? null,
        source:
          "InventoryLocation + InventoryBalance + latest PredictiveInventoryOptimizationSignal",
      },
    });
  }

  const enterpriseCurrent = signals.reduce(
    (sum, item) => sum + item.currentUnits,
    0,
  );
  const enterpriseDemand = signals.reduce(
    (sum, item) => sum + item.projectedDemandUnits,
    0,
  );
  const enterpriseInbound = signals.reduce(
    (sum, item) => sum + item.projectedInboundUnits,
    0,
  );
  const enterpriseCapacity = signals.reduce(
    (sum, item) => sum + item.operatingCapacityProxy,
    0,
  );
  const enterpriseEnding = Math.max(
    0,
    enterpriseCurrent +
      enterpriseInbound -
      enterpriseDemand,
  );
  const enterpriseUtilization =
    enterpriseCapacity > 0
      ? (enterpriseEnding / enterpriseCapacity) * 100
      : 0;
  const enterpriseGap = Math.max(
    0,
    enterpriseEnding - enterpriseCapacity,
  );

  signals.unshift({
    tenantId: input.tenantId,
    capacityRunId: run.id,
    scopeType: "ENTERPRISE",
    scopeKey: "enterprise",
    scopeLabel: "Enterprise inventory capacity",
    currentUnits: round(enterpriseCurrent, 4),
    projectedDemandUnits: round(enterpriseDemand, 4),
    projectedInboundUnits: round(enterpriseInbound, 4),
    projectedEndingUnits: round(enterpriseEnding, 4),
    operatingCapacityProxy: round(
      enterpriseCapacity,
      4,
    ),
    currentUtilizationPct: round(
      enterpriseCapacity > 0
        ? (enterpriseCurrent / enterpriseCapacity) * 100
        : 0,
      2,
    ),
    projectedUtilizationPct: round(
      enterpriseUtilization,
      2,
    ),
    capacityGapUnits: round(enterpriseGap, 4),
    pressureScore: round(
      clamp(enterpriseUtilization, 0, 150),
      2,
    ),
    riskLevel: level(enterpriseUtilization),
    recommendation: recommendation(
      enterpriseUtilization,
      enterpriseGap,
    ),
    confidence: latestInventoryRun ? 85 : 60,
    evidence: {
      activeLocationCount: locations.length,
      targetHeadroomPct: input.targetHeadroomPct,
      optimizationRunId: latestInventoryRun?.id ?? null,
      capacityBasis: "inventory-unit operating proxy",
    },
  });

  const runtimeAcceptedSignals: typeof signals = [];

  for (const signal of signals) {
    const decision =
      await evaluateMultiEngineControlledConfidence({
        tenantId: input.tenantId,
        decisionPath:
          MULTI_ENGINE_DECISION_PATHS.PREDICTIVE_CAPACITY,
        confidence: signal.confidence,
        actorUserId: input.createdByUserId,
        correlationId: run.id,
        extraEvidence: {
          capacityRunId: run.id,
          scopeType: signal.scopeType,
          scopeKey: signal.scopeKey,
          scopeLabel: signal.scopeLabel,
          riskLevel: signal.riskLevel,
          recommendation: signal.recommendation,
        },
      });

    if (decision.effectiveAllowed) {
      runtimeAcceptedSignals.push(signal);
    }
  }

  if (runtimeAcceptedSignals.length > 0) {
    await prisma.predictiveCapacityPlanningSignal.createMany({
      data: runtimeAcceptedSignals,
    });
  }

  return {
    run,
    signalCount: runtimeAcceptedSignals.length,
    candidateSignalCount: signals.length,
    suppressedSignalCount:
      signals.length - runtimeAcceptedSignals.length,
  };
}
