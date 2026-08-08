import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

const round = (value: number, digits = 2) => {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const pct = (value: number) => value / 100;

function variancePct(baseline: number, scenario: number) {
  if (baseline === 0) return scenario === 0 ? 0 : 100;
  return ((scenario - baseline) / Math.abs(baseline)) * 100;
}

function severity(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude >= 35) return "CRITICAL";
  if (magnitude >= 20) return "HIGH";
  if (magnitude >= 10) return "MEDIUM";
  return "LOW";
}

function overallRisk(scores: number[]) {
  const max = Math.max(0, ...scores);
  if (max >= 85) return "CRITICAL";
  if (max >= 65) return "HIGH";
  if (max >= 40) return "MEDIUM";
  return "LOW";
}

export async function runProcurementDigitalTwin(input: {
  tenantId: string;
  createdByUserId: string;
  scenarioId: string;
}) {
  const scenario =
    await prisma.procurementDigitalTwinScenario.findFirstOrThrow({
      where: {
        id: input.scenarioId,
        tenantId: input.tenantId,
      },
    });

  const [
    procurementRun,
    inventoryRun,
    capacityRun,
    suppliers,
  ] = await Promise.all([
    prisma.predictiveProcurementForecastRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.predictiveInventoryOptimizationRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.predictiveCapacityPlanningRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.supplierMarketplaceProfile.findMany({
      where: {
        tenantId: input.tenantId,
        marketplaceVisible: true,
      },
      select: {
        supplierId: true,
        verificationStatus: true,
        riskScore: true,
        performanceScore: true,
      },
      take: 1000,
    }),
  ]);

  const procurementSignals = procurementRun
    ? await prisma.predictiveProcurementForecastSignal.findMany({
        where: {
          tenantId: input.tenantId,
          forecastRunId: procurementRun.id,
        },
      })
    : [];

  const inventorySignals = inventoryRun
    ? await prisma.predictiveInventoryOptimizationSignal.findMany({
        where: {
          tenantId: input.tenantId,
          optimizationRunId: inventoryRun.id,
        },
      })
    : [];

  const capacitySignals = capacityRun
    ? await prisma.predictiveCapacityPlanningSignal.findMany({
        where: {
          tenantId: input.tenantId,
          capacityRunId: capacityRun.id,
        },
      })
    : [];

  const spend = procurementSignals.find(
    (signal) => signal.signalType === "SPEND_FORECAST",
  );

  const baselineSpend =
    spend?.forecastValue === null ||
    spend?.forecastValue === undefined
      ? 0
      : Number(spend.forecastValue);

  const baselineDemand = inventorySignals.reduce(
    (sum, signal) =>
      sum + Number(signal.horizonDemand),
    0,
  );

  const baselineInbound = inventorySignals.reduce(
    (sum, signal) =>
      sum + Number(signal.suggestedReorderQty),
    0,
  );

  const baselineStockoutExposure =
    inventorySignals.length === 0
      ? 0
      : inventorySignals.reduce(
          (sum, signal) =>
            sum + Number(signal.stockoutProbability),
          0,
        ) / inventorySignals.length;

  const enterpriseCapacity = capacitySignals.find(
    (signal) => signal.scopeType === "ENTERPRISE",
  );

  const baselineCapacityUtilization =
    enterpriseCapacity?.projectedUtilizationPct === null ||
    enterpriseCapacity?.projectedUtilizationPct === undefined
      ? 0
      : Number(
          enterpriseCapacity.projectedUtilizationPct,
        );

  const supplierRiskAverage =
    suppliers.length === 0
      ? 0
      : suppliers.reduce(
          (sum, supplier) =>
            sum +
            (supplier.riskScore === null
              ? 50
              : Number(supplier.riskScore)),
          0,
        ) / suppliers.length;

  const demandShock = pct(
    Number(scenario.demandShockPct),
  );
  const leadTimeShock = pct(
    Number(scenario.leadTimeShockPct),
  );
  const costInflation = pct(
    Number(scenario.costInflationPct),
  );
  const supplierDisruption = pct(
    Number(scenario.supplierDisruptionPct),
  );
  const inboundReduction = pct(
    Number(scenario.inboundReductionPct),
  );
  const safetyStockChange = pct(
    Number(scenario.safetyStockChangePct),
  );

  const scenarioDemand =
    baselineDemand * (1 + demandShock);

  const scenarioInbound =
    baselineInbound *
    (1 - inboundReduction) *
    (1 - supplierDisruption * 0.5);

  const scenarioSpend =
    baselineSpend *
    (1 + demandShock) *
    (1 + costInflation);

  const stockoutPressure =
    baselineStockoutExposure +
    Math.max(0, demandShock) * 45 +
    Math.max(0, leadTimeShock) * 35 +
    Math.max(0, supplierDisruption) * 45 +
    Math.max(0, inboundReduction) * 40 -
    Math.max(0, safetyStockChange) * 20;

  const scenarioStockoutExposure =
    clamp(stockoutPressure, 0, 100);

  const netInventoryPressure =
    baselineDemand === 0
      ? 0
      : (scenarioDemand - scenarioInbound) /
        Math.max(1, baselineDemand);

  const scenarioCapacityUtilization = clamp(
    baselineCapacityUtilization *
      (1 +
        Math.max(0, netInventoryPressure) * 0.25 +
        Math.max(0, demandShock) * 0.1),
    0,
    150,
  );

  const scenarioSupplierRisk = clamp(
    supplierRiskAverage +
      supplierDisruption * 50 +
      leadTimeShock * 20,
    0,
    100,
  );

  const baselineSnapshot: Prisma.InputJsonValue = {
    procurementForecastRunId: procurementRun?.id ?? null,
    inventoryOptimizationRunId: inventoryRun?.id ?? null,
    capacityPlanningRunId: capacityRun?.id ?? null,
    spendForecast: round(baselineSpend, 2),
    demandUnits: round(baselineDemand, 2),
    inboundUnits: round(baselineInbound, 2),
    averageStockoutProbability: round(
      baselineStockoutExposure,
      2,
    ),
    projectedCapacityUtilizationPct: round(
      baselineCapacityUtilization,
      2,
    ),
    averageMarketplaceSupplierRisk: round(
      supplierRiskAverage,
      2,
    ),
  };

  const scenarioSnapshot: Prisma.InputJsonValue = {
    spendForecast: round(scenarioSpend, 2),
    demandUnits: round(scenarioDemand, 2),
    inboundUnits: round(scenarioInbound, 2),
    averageStockoutProbability: round(
      scenarioStockoutExposure,
      2,
    ),
    projectedCapacityUtilizationPct: round(
      scenarioCapacityUtilization,
      2,
    ),
    averageMarketplaceSupplierRisk: round(
      scenarioSupplierRisk,
      2,
    ),
    shocks: {
      demandShockPct: Number(scenario.demandShockPct),
      leadTimeShockPct: Number(
        scenario.leadTimeShockPct,
      ),
      costInflationPct: Number(
        scenario.costInflationPct,
      ),
      supplierDisruptionPct: Number(
        scenario.supplierDisruptionPct,
      ),
      inboundReductionPct: Number(
        scenario.inboundReductionPct,
      ),
      safetyStockChangePct: Number(
        scenario.safetyStockChangePct,
      ),
    },
  };

  const spendVariance = variancePct(
    baselineSpend,
    scenarioSpend,
  );
  const demandVariance = variancePct(
    baselineDemand,
    scenarioDemand,
  );
  const inboundVariance = variancePct(
    baselineInbound,
    scenarioInbound,
  );
  const stockoutVariance =
    scenarioStockoutExposure -
    baselineStockoutExposure;
  const capacityVariance =
    scenarioCapacityUtilization -
    baselineCapacityUtilization;
  const supplierRiskVariance =
    scenarioSupplierRisk - supplierRiskAverage;

  const risk = overallRisk([
    scenarioStockoutExposure,
    scenarioCapacityUtilization,
    scenarioSupplierRisk,
  ]);

  const recommendation =
    risk === "CRITICAL"
      ? "EXECUTIVE_MITIGATION_REQUIRED"
      : risk === "HIGH"
        ? "MITIGATE_BEFORE_EXECUTION"
        : risk === "MEDIUM"
          ? "REVIEW_AND_PREPARE_CONTROLS"
          : "SCENARIO_ACCEPTABLE_FOR_REVIEW";

  const summary: Prisma.InputJsonValue = {
    riskLevel: risk,
    recommendation,
    spendVariancePct: round(spendVariance, 2),
    demandVariancePct: round(demandVariance, 2),
    inboundVariancePct: round(inboundVariance, 2),
    stockoutVariancePoints: round(
      stockoutVariance,
      2,
    ),
    capacityVariancePoints: round(
      capacityVariance,
      2,
    ),
    supplierRiskVariancePoints: round(
      supplierRiskVariance,
      2,
    ),
  };

  const run =
    await prisma.procurementDigitalTwinRun.create({
      data: {
        tenantId: input.tenantId,
        scenarioId: scenario.id,
        createdByUserId: input.createdByUserId,
        baselineSnapshot,
        scenarioSnapshot,
        summary,
        riskLevel: risk,
        recommendation,
      },
    });

  const impacts: Array<{
    tenantId: string;
    digitalTwinRunId: string;
    impactType: string;
    scopeKey: string;
    scopeLabel: string;
    baselineValue: number;
    scenarioValue: number;
    varianceValue: number;
    variancePct: number;
    severity: string;
    explanation: string;
    evidence: Prisma.InputJsonValue;
  }> = [
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "SPEND",
      scopeKey: "enterprise-spend",
      scopeLabel: "Enterprise procurement spend",
      baselineValue: baselineSpend,
      scenarioValue: scenarioSpend,
      varianceValue: scenarioSpend - baselineSpend,
      variancePct: spendVariance,
      severity: severity(spendVariance),
      explanation:
        "Projected procurement spend after demand and cost-inflation shocks.",
      evidence: {
        demandShockPct: Number(scenario.demandShockPct),
        costInflationPct: Number(
          scenario.costInflationPct,
        ),
      },
    },
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "DEMAND",
      scopeKey: "enterprise-demand",
      scopeLabel: "Enterprise inventory demand",
      baselineValue: baselineDemand,
      scenarioValue: scenarioDemand,
      varianceValue: scenarioDemand - baselineDemand,
      variancePct: demandVariance,
      severity: severity(demandVariance),
      explanation:
        "Inventory demand after applying the scenario demand shock.",
      evidence: {
        demandShockPct: Number(scenario.demandShockPct),
      },
    },
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "INBOUND",
      scopeKey: "enterprise-inbound",
      scopeLabel: "Projected replenishment inbound",
      baselineValue: baselineInbound,
      scenarioValue: scenarioInbound,
      varianceValue: scenarioInbound - baselineInbound,
      variancePct: inboundVariance,
      severity: severity(inboundVariance),
      explanation:
        "Projected inbound after supplier disruption and inbound-reduction assumptions.",
      evidence: {
        supplierDisruptionPct: Number(
          scenario.supplierDisruptionPct,
        ),
        inboundReductionPct: Number(
          scenario.inboundReductionPct,
        ),
      },
    },
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "STOCKOUT_RISK",
      scopeKey: "enterprise-stockout",
      scopeLabel: "Average stockout probability",
      baselineValue: baselineStockoutExposure,
      scenarioValue: scenarioStockoutExposure,
      varianceValue: stockoutVariance,
      variancePct: variancePct(
        baselineStockoutExposure,
        scenarioStockoutExposure,
      ),
      severity: severity(stockoutVariance),
      explanation:
        "Estimated stockout exposure after demand, lead-time, supplier-disruption, inbound and safety-stock shocks.",
      evidence: {
        baselineInventoryRunId: inventoryRun?.id ?? null,
      },
    },
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "CAPACITY",
      scopeKey: "enterprise-capacity",
      scopeLabel: "Projected capacity utilization",
      baselineValue: baselineCapacityUtilization,
      scenarioValue: scenarioCapacityUtilization,
      varianceValue: capacityVariance,
      variancePct: variancePct(
        baselineCapacityUtilization,
        scenarioCapacityUtilization,
      ),
      severity: severity(capacityVariance),
      explanation:
        "Projected inventory-unit capacity pressure under the simulated scenario.",
      evidence: {
        baselineCapacityRunId: capacityRun?.id ?? null,
      },
    },
    {
      tenantId: input.tenantId,
      digitalTwinRunId: run.id,
      impactType: "SUPPLIER_RISK",
      scopeKey: "marketplace-supplier-risk",
      scopeLabel: "Marketplace supplier risk",
      baselineValue: supplierRiskAverage,
      scenarioValue: scenarioSupplierRisk,
      varianceValue: supplierRiskVariance,
      variancePct: variancePct(
        supplierRiskAverage,
        scenarioSupplierRisk,
      ),
      severity: severity(supplierRiskVariance),
      explanation:
        "Supplier-risk pressure after disruption and lead-time shocks.",
      evidence: {
        marketplaceSupplierCount: suppliers.length,
      },
    },
  ];

  await prisma.procurementDigitalTwinImpact.createMany({
    data: impacts.map((impact) => ({
      ...impact,
      baselineValue: round(impact.baselineValue, 4),
      scenarioValue: round(impact.scenarioValue, 4),
      varianceValue: round(impact.varianceValue, 4),
      variancePct: round(impact.variancePct, 4),
    })),
  });

  await prisma.procurementDigitalTwinScenario.update({
    where: { id: scenario.id },
    data: {
      status: "SIMULATED",
      simulatedAt: new Date(),
    },
  });

  return {
    run,
    impactCount: impacts.length,
  };
}
