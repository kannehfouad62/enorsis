import { Prisma } from "@/generated/prisma/client";
import { executeGovernedAi } from "@/core/ai/gateway";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

const round = (value: number, digits = 2) => {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
};

function priorityFromRisk(
  riskLevel: string,
  stockoutProbability = 0,
) {
  if (
    riskLevel === "CRITICAL" ||
    stockoutProbability >= 85
  ) {
    return "CRITICAL";
  }

  if (
    riskLevel === "HIGH" ||
    stockoutProbability >= 65
  ) {
    return "HIGH";
  }

  if (
    riskLevel === "MEDIUM" ||
    stockoutProbability >= 40
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function overallRisk(levels: string[]) {
  if (levels.includes("CRITICAL")) return "CRITICAL";
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}

export async function generateAutonomousProcurementPlan(
  input: {
    tenantId: string;
    userId: string;
    userEmail: string;
    horizonDays: number;
    title: string;
  },
) {
  const [
    procurementRun,
    inventoryRun,
    capacityRun,
    digitalTwinRun,
    supplierMatchRun,
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
    prisma.procurementDigitalTwinRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.supplierMarketplaceMatchRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [
    procurementSignals,
    inventorySignals,
    capacitySignals,
    supplierMatchResults,
  ] = await Promise.all([
    procurementRun
      ? prisma.predictiveProcurementForecastSignal.findMany({
          where: {
            tenantId: input.tenantId,
            forecastRunId: procurementRun.id,
          },
        })
      : Promise.resolve([]),
    inventoryRun
      ? prisma.predictiveInventoryOptimizationSignal.findMany({
          where: {
            tenantId: input.tenantId,
            optimizationRunId: inventoryRun.id,
          },
          orderBy: [
            { stockoutProbability: "desc" },
            { suggestedReorderQty: "desc" },
          ],
          take: 500,
        })
      : Promise.resolve([]),
    capacityRun
      ? prisma.predictiveCapacityPlanningSignal.findMany({
          where: {
            tenantId: input.tenantId,
            capacityRunId: capacityRun.id,
            scopeType: "LOCATION",
          },
          orderBy: { projectedUtilizationPct: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    supplierMatchRun
      ? prisma.supplierMarketplaceMatchResult.findMany({
          where: {
            tenantId: input.tenantId,
            matchRunId: supplierMatchRun.id,
          },
          orderBy: { rank: "asc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const spendSignal = procurementSignals.find(
    (signal) => signal.signalType === "SPEND_FORECAST",
  );

  const estimatedSpendUsd =
    spendSignal?.forecastValue === null ||
    spendSignal?.forecastValue === undefined
      ? 0
      : Number(spendSignal.forecastValue);

  const topSupplier =
    supplierMatchResults[0] ?? null;

  const actions: Array<{
    actionType: string;
    resourceType: string;
    resourceId: string | null;
    resourceLabel: string;
    priority: string;
    recommendation: string;
    proposedQuantity: number | null;
    proposedValueUsd: number | null;
    proposedSupplierId: string | null;
    confidence: number;
    riskLevel: string;
    evidence: Prisma.InputJsonValue;
  }> = [];

  for (const signal of inventorySignals) {
    const reorderQty = Number(signal.suggestedReorderQty);
    const stockout = Number(signal.stockoutProbability);

    if (
      reorderQty <= 0 &&
      !["URGENT_REORDER", "REORDER"].includes(
        signal.recommendation,
      )
    ) {
      continue;
    }

    const priority = priorityFromRisk(
      signal.riskLevel,
      stockout,
    );

    const proposedValueUsd =
      reorderQty * Number(signal.unitCost);

    actions.push({
      actionType: "REPLENISH_INVENTORY",
      resourceType: "InventoryItem",
      resourceId: signal.inventoryItemId,
      resourceLabel: `${signal.sku} — ${signal.itemName}`,
      priority,
      recommendation:
        priority === "CRITICAL"
          ? "Prepare an urgent replenishment sourcing action and obtain required human approvals."
          : "Prepare a governed replenishment sourcing action for human review.",
      proposedQuantity: round(reorderQty, 4),
      proposedValueUsd: round(proposedValueUsd, 4),
      proposedSupplierId:
        topSupplier?.supplierId ?? null,
      confidence: Number(signal.confidence),
      riskLevel: signal.riskLevel,
      evidence: {
        predictiveInventorySignalId: signal.id,
        stockoutProbability: stockout,
        daysOfSupply:
          signal.daysOfSupply === null
            ? null
            : Number(signal.daysOfSupply),
        predictedReorderPoint: Number(
          signal.predictedReorderPoint,
        ),
        recommendedSafetyStock: Number(
          signal.recommendedSafetyStock,
        ),
        suggestedReorderQty: reorderQty,
        supplierMatchRunId:
          supplierMatchRun?.id ?? null,
        proposedSupplierRank:
          topSupplier?.rank ?? null,
        note:
          "Supplier reference is advisory and does not constitute award or selection.",
      },
    });
  }

  for (const signal of capacitySignals) {
    if (
      Number(signal.projectedUtilizationPct) < 100
    ) {
      continue;
    }

    actions.push({
      actionType: "REBALANCE_CAPACITY",
      resourceType: "InventoryLocation",
      resourceId: signal.scopeKey,
      resourceLabel: signal.scopeLabel,
      priority: priorityFromRisk(signal.riskLevel),
      recommendation:
        signal.recommendation.replaceAll("_", " "),
      proposedQuantity: Number(
        signal.capacityGapUnits,
      ),
      proposedValueUsd: null,
      proposedSupplierId: null,
      confidence: Number(signal.confidence),
      riskLevel: signal.riskLevel,
      evidence: {
        predictiveCapacitySignalId: signal.id,
        projectedUtilizationPct: Number(
          signal.projectedUtilizationPct,
        ),
        capacityGapUnits: Number(
          signal.capacityGapUnits,
        ),
        capacityRunId: capacityRun?.id ?? null,
      },
    });
  }

  if (
    digitalTwinRun &&
    ["HIGH", "CRITICAL"].includes(
      digitalTwinRun.riskLevel,
    )
  ) {
    actions.push({
      actionType: "MITIGATE_SCENARIO_RISK",
      resourceType: "ProcurementDigitalTwinRun",
      resourceId: digitalTwinRun.id,
      resourceLabel: "Latest procurement digital twin",
      priority: digitalTwinRun.riskLevel,
      recommendation:
        "Review and mitigate the latest high-risk digital-twin scenario before committing material procurement actions.",
      proposedQuantity: null,
      proposedValueUsd: null,
      proposedSupplierId: null,
      confidence: 85,
      riskLevel: digitalTwinRun.riskLevel,
      evidence: {
        digitalTwinRunId: digitalTwinRun.id,
        scenarioId: digitalTwinRun.scenarioId,
        recommendation:
          digitalTwinRun.recommendation,
        summary: digitalTwinRun.summary,
      },
    });
  }

  const proposedActionSpend = actions.reduce(
    (sum, action) =>
      sum + (action.proposedValueUsd ?? 0),
    0,
  );

  const risk = overallRisk(
    actions.map((action) => action.riskLevel),
  );

  const sourceSnapshot: Prisma.InputJsonValue = {
    predictiveProcurementRunId:
      procurementRun?.id ?? null,
    predictiveInventoryRunId:
      inventoryRun?.id ?? null,
    predictiveCapacityRunId:
      capacityRun?.id ?? null,
    digitalTwinRunId: digitalTwinRun?.id ?? null,
    supplierMatchRunId:
      supplierMatchRun?.id ?? null,
    generatedFromLatestAvailableEvidence: true,
  };

  const summary: Prisma.InputJsonValue = {
    actionCount: actions.length,
    criticalActions: actions.filter(
      (action) => action.priority === "CRITICAL",
    ).length,
    highActions: actions.filter(
      (action) => action.priority === "HIGH",
    ).length,
    replenishmentActions: actions.filter(
      (action) =>
        action.actionType === "REPLENISH_INVENTORY",
    ).length,
    capacityActions: actions.filter(
      (action) =>
        action.actionType === "REBALANCE_CAPACITY",
    ).length,
    estimatedPlanActionSpendUsd: round(
      proposedActionSpend,
      2,
    ),
    forecastSpendUsd: round(
      estimatedSpendUsd,
      2,
    ),
    humanApprovalRequired: true,
    executionMode: "RECOMMENDATION_ONLY",
  };

  const plan =
    await prisma.autonomousProcurementPlan.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.userId,
        title: input.title,
        horizonDays: input.horizonDays,
        sourceSnapshot,
        summary,
        overallRiskLevel: risk,
        estimatedSpendUsd: round(
          proposedActionSpend || estimatedSpendUsd,
          4,
        ),
        estimatedSavingsUsd: 0,
        requiresHumanApproval: true,
        status: "PENDING_APPROVAL",
      },
    });

  if (actions.length > 0) {
    await prisma.autonomousProcurementPlanAction.createMany({
      data: actions.map((action, index) => ({
        tenantId: input.tenantId,
        planId: plan.id,
        sequence: index + 1,
        ...action,
      })),
    });
  }

  try {
    const ai = await executeGovernedAi({
      tenantId: input.tenantId,
      userId: input.userId,
      userEmail: input.userEmail,
      capability: "PROCUREMENT_COPILOT",
      resourceType: "AutonomousProcurementPlan",
      resourceId: plan.id,
      input: [
        "Review this deterministic Enorsis autonomous procurement plan.",
        "Do not create new facts, suppliers, quantities, approvals, or transactions.",
        "Do not treat this plan as approved.",
        "Explain priorities, dependencies, risks, missing due diligence, approval needs, and a recommended human review sequence.",
        "",
        `Plan summary: ${JSON.stringify(summary)}`,
        `Plan actions: ${JSON.stringify(
          actions.slice(0, 50).map((action, index) => ({
            sequence: index + 1,
            actionType: action.actionType,
            resourceLabel: action.resourceLabel,
            priority: action.priority,
            recommendation: action.recommendation,
            proposedQuantity: action.proposedQuantity,
            proposedValueUsd: action.proposedValueUsd,
            riskLevel: action.riskLevel,
            evidence: action.evidence,
          })),
        )}`,
      ].join("\n"),
    });

    await prisma.autonomousProcurementPlan.update({
      where: { id: plan.id },
      data: {
        aiExecutionId: ai.id,
        aiNarrative: ai.outputText,
      },
    });
  } catch (error) {
    await prisma.autonomousProcurementPlan.update({
      where: { id: plan.id },
      data: {
        aiError:
          error instanceof Error
            ? error.message
            : "Governed AI planning narrative failed.",
      },
    });
  }

  return {
    plan,
    actionCount: actions.length,
  };
}
