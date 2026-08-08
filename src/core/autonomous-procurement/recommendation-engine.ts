import { Prisma } from "@/generated/prisma/client";
import { executeGovernedAi } from "@/core/ai/gateway";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

const round = (value: number, digits = 2) => {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
};

function riskRank(level: string) {
  return level === "CRITICAL"
    ? 4
    : level === "HIGH"
      ? 3
      : level === "MEDIUM"
        ? 2
        : 1;
}

function overallRisk(levels: string[]) {
  const max = Math.max(1, ...levels.map(riskRank));
  return max >= 4
    ? "CRITICAL"
    : max === 3
      ? "HIGH"
      : max === 2
        ? "MEDIUM"
        : "LOW";
}

function priority(level: string, confidence = 50) {
  if (level === "CRITICAL") return "CRITICAL";
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM" || confidence >= 80) return "MEDIUM";
  return "LOW";
}

export async function generateAutonomousRecommendations(
  input: {
    tenantId: string;
    userId: string;
    userEmail: string;
    title: string;
    horizonDays: number;
    sourcePlanId?: string | null;
  },
) {
  const sourcePlan = input.sourcePlanId
    ? await prisma.autonomousProcurementPlan.findFirst({
        where: {
          id: input.sourcePlanId,
          tenantId: input.tenantId,
        },
      })
    : await prisma.autonomousProcurementPlan.findFirst({
        where: {
          tenantId: input.tenantId,
          status: "APPROVED",
        },
        orderBy: { approvedAt: "desc" },
      });

  const [
    planActions,
    inventoryRun,
    capacityRun,
    digitalTwinRun,
    procurementRun,
  ] = await Promise.all([
    sourcePlan
      ? prisma.autonomousProcurementPlanAction.findMany({
          where: {
            tenantId: input.tenantId,
            planId: sourcePlan.id,
          },
          orderBy: { sequence: "asc" },
        })
      : Promise.resolve([]),
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
    prisma.predictiveProcurementForecastRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { generatedAt: "desc" },
    }),
  ]);

  const [
    inventorySignals,
    capacitySignals,
    digitalTwinImpacts,
    procurementSignals,
  ] = await Promise.all([
    inventoryRun
      ? prisma.predictiveInventoryOptimizationSignal.findMany({
          where: {
            tenantId: input.tenantId,
            optimizationRunId: inventoryRun.id,
          },
          orderBy: [
            { excessValue: "desc" },
            { stockoutProbability: "desc" },
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
    digitalTwinRun
      ? prisma.procurementDigitalTwinImpact.findMany({
          where: {
            tenantId: input.tenantId,
            digitalTwinRunId: digitalTwinRun.id,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    procurementRun
      ? prisma.predictiveProcurementForecastSignal.findMany({
          where: {
            tenantId: input.tenantId,
            forecastRunId: procurementRun.id,
          },
        })
      : Promise.resolve([]),
  ]);

  const recommendations: Array<{
    recommendationType: string;
    title: string;
    description: string;
    priority: string;
    riskLevel: string;
    estimatedSavingsUsd: number | null;
    estimatedExposureUsd: number | null;
    confidence: number;
    resourceType: string | null;
    resourceId: string | null;
    resourceLabel: string | null;
    evidence: Prisma.InputJsonValue;
  }> = [];

  const excessSignals = inventorySignals.filter(
    (signal) => Number(signal.excessValue) > 0,
  );

  for (const signal of excessSignals.slice(0, 25)) {
    const excessValue = Number(signal.excessValue);
    const estimatedSavings = excessValue * 0.15;

    recommendations.push({
      recommendationType: "SAVINGS_OPPORTUNITY",
      title: `Reduce or rebalance excess inventory: ${signal.sku}`,
      description:
        "Evaluate transfer, consumption acceleration, order deferral, supplier return, or disposition options to reduce excess working capital.",
      priority: excessValue >= 50000 ? "HIGH" : "MEDIUM",
      riskLevel: signal.riskLevel,
      estimatedSavingsUsd: round(estimatedSavings, 4),
      estimatedExposureUsd: round(excessValue, 4),
      confidence: Number(signal.confidence),
      resourceType: "InventoryItem",
      resourceId: signal.inventoryItemId,
      resourceLabel: `${signal.sku} — ${signal.itemName}`,
      evidence: {
        predictiveInventorySignalId: signal.id,
        excessQuantity: Number(signal.excessQuantity),
        excessValue,
        currentAvailable: Number(signal.currentAvailable),
        horizonDemand: Number(signal.horizonDemand),
        note:
          "Savings estimate uses a conservative 15% working-capital/value recovery assumption and requires human validation.",
      },
    });
  }

  for (const action of planActions) {
    if (
      action.actionType !== "REPLENISH_INVENTORY" ||
      num(action.proposedValueUsd) <= 0
    ) {
      continue;
    }

    const proposedValue = num(action.proposedValueUsd);
    const savings = proposedValue * 0.03;

    recommendations.push({
      recommendationType: "STRATEGY_RECOMMENDATION",
      title: `Strategic sourcing review: ${action.resourceLabel}`,
      description:
        "Before execution, consider competitive sourcing, volume consolidation, negotiated pricing, alternate suppliers, or contract leverage for this planned replenishment.",
      priority: action.priority,
      riskLevel: action.riskLevel,
      estimatedSavingsUsd: round(savings, 4),
      estimatedExposureUsd: round(proposedValue, 4),
      confidence: Number(action.confidence),
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      resourceLabel: action.resourceLabel,
      evidence: {
        autonomousPlanActionId: action.id,
        sourcePlanId: sourcePlan?.id ?? null,
        proposedValueUsd: proposedValue,
        proposedSupplierId: action.proposedSupplierId,
        note:
          "Savings estimate uses a conservative 3% sourcing-improvement hypothesis; no supplier award is implied.",
      },
    });
  }

  for (const impact of digitalTwinImpacts) {
    if (!["HIGH", "CRITICAL"].includes(impact.severity)) {
      continue;
    }

    recommendations.push({
      recommendationType: "RISK_MITIGATION",
      title: `Mitigate ${impact.impactType.replaceAll("_", " ").toLowerCase()} exposure`,
      description:
        "Create and approve a mitigation response before material procurement commitments are executed against this scenario.",
      priority: impact.severity,
      riskLevel: impact.severity,
      estimatedSavingsUsd: null,
      estimatedExposureUsd:
        impact.scenarioValue === null
          ? null
          : Math.abs(Number(impact.scenarioValue)),
      confidence: 85,
      resourceType: "ProcurementDigitalTwinImpact",
      resourceId: impact.id,
      resourceLabel: impact.scopeLabel,
      evidence: {
        digitalTwinRunId: digitalTwinRun?.id ?? null,
        impactType: impact.impactType,
        baselineValue:
          impact.baselineValue === null
            ? null
            : Number(impact.baselineValue),
        scenarioValue:
          impact.scenarioValue === null
            ? null
            : Number(impact.scenarioValue),
        variancePct:
          impact.variancePct === null
            ? null
            : Number(impact.variancePct),
        explanation: impact.explanation,
      },
    });
  }

  for (const signal of capacitySignals) {
    if (Number(signal.projectedUtilizationPct) < 100) {
      continue;
    }

    recommendations.push({
      recommendationType: "RISK_MITIGATION",
      title: `Capacity mitigation: ${signal.scopeLabel}`,
      description:
        "Review inventory redistribution, inbound pacing, alternate storage, or demand timing to reduce projected over-capacity pressure.",
      priority: priority(
        signal.riskLevel,
        Number(signal.confidence),
      ),
      riskLevel: signal.riskLevel,
      estimatedSavingsUsd: null,
      estimatedExposureUsd: null,
      confidence: Number(signal.confidence),
      resourceType: "InventoryLocation",
      resourceId: signal.scopeKey,
      resourceLabel: signal.scopeLabel,
      evidence: {
        predictiveCapacitySignalId: signal.id,
        projectedUtilizationPct: Number(
          signal.projectedUtilizationPct,
        ),
        capacityGapUnits: Number(signal.capacityGapUnits),
        recommendation: signal.recommendation,
      },
    });
  }

  const spendForecast = procurementSignals.find(
    (signal) => signal.signalType === "SPEND_FORECAST",
  );

  if (
    spendForecast?.forecastValue !== null &&
    spendForecast?.forecastValue !== undefined &&
    Number(spendForecast.forecastValue) > 0
  ) {
    const spend = Number(spendForecast.forecastValue);

    recommendations.push({
      recommendationType: "SAVINGS_OPPORTUNITY",
      title: "Enterprise spend optimization program",
      description:
        "Prioritize category consolidation, competitive sourcing, specification rationalization, demand management and contract-compliance analysis against the forecast spend base.",
      priority: "MEDIUM",
      riskLevel: spendForecast.riskLevel,
      estimatedSavingsUsd: round(spend * 0.02, 4),
      estimatedExposureUsd: round(spend, 4),
      confidence: Number(spendForecast.confidence),
      resourceType: "PredictiveProcurementForecastSignal",
      resourceId: spendForecast.id,
      resourceLabel: "Forecast procurement spend",
      evidence: {
        predictiveProcurementSignalId: spendForecast.id,
        forecastSpendUsd: spend,
        savingsHypothesisPct: 2,
        note:
          "The 2% estimate is a planning hypothesis only and must be validated through category-level sourcing analysis.",
      },
    });
  }

  const totalSavings = recommendations.reduce(
    (sum, recommendation) =>
      sum + (recommendation.estimatedSavingsUsd ?? 0),
    0,
  );

  const totalExposure = recommendations.reduce(
    (sum, recommendation) =>
      sum + (recommendation.estimatedExposureUsd ?? 0),
    0,
  );

  const risk = overallRisk(
    recommendations.map(
      (recommendation) => recommendation.riskLevel,
    ),
  );

  const sourceSnapshot: Prisma.InputJsonValue = {
    sourcePlanId: sourcePlan?.id ?? null,
    sourcePlanStatus: sourcePlan?.status ?? null,
    predictiveProcurementRunId:
      procurementRun?.id ?? null,
    predictiveInventoryRunId:
      inventoryRun?.id ?? null,
    predictiveCapacityRunId:
      capacityRun?.id ?? null,
    digitalTwinRunId: digitalTwinRun?.id ?? null,
  };

  const summary: Prisma.InputJsonValue = {
    recommendationCount: recommendations.length,
    strategyRecommendations: recommendations.filter(
      (item) =>
        item.recommendationType ===
        "STRATEGY_RECOMMENDATION",
    ).length,
    savingsOpportunities: recommendations.filter(
      (item) =>
        item.recommendationType ===
        "SAVINGS_OPPORTUNITY",
    ).length,
    riskMitigations: recommendations.filter(
      (item) =>
        item.recommendationType === "RISK_MITIGATION",
    ).length,
    estimatedSavingsUsd: round(totalSavings, 2),
    estimatedExposureUsd: round(totalExposure, 2),
    humanReviewRequired: true,
    executionMode: "RECOMMENDATION_ONLY",
  };

  const set =
    await prisma.autonomousProcurementRecommendationSet.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.userId,
        sourcePlanId: sourcePlan?.id ?? null,
        title: input.title,
        horizonDays: input.horizonDays,
        overallRiskLevel: risk,
        estimatedSavingsUsd: round(totalSavings, 4),
        estimatedExposureUsd: round(totalExposure, 4),
        sourceSnapshot,
        summary,
        status: "PENDING_REVIEW",
      },
    });

  if (recommendations.length > 0) {
    await prisma.autonomousProcurementRecommendation.createMany({
      data: recommendations.map(
        (recommendation, index) => ({
          tenantId: input.tenantId,
          recommendationSetId: set.id,
          sequence: index + 1,
          ...recommendation,
        }),
      ),
    });
  }

  try {
    const ai = await executeGovernedAi({
      tenantId: input.tenantId,
      userId: input.userId,
      userEmail: input.userEmail,
      capability: "PROCUREMENT_COPILOT",
      resourceType:
        "AutonomousProcurementRecommendationSet",
      resourceId: set.id,
      input: [
        "Review this deterministic Enorsis procurement recommendation set.",
        "Do not invent suppliers, savings, exposures, approvals, contracts, transactions, or evidence.",
        "Treat savings figures as planning hypotheses, not realized savings.",
        "Prioritize recommendations, identify dependencies, due diligence, approval needs, sequencing, and risks.",
        "Do not execute or claim execution of any recommendation.",
        "",
        `Recommendation summary: ${JSON.stringify(summary)}`,
        `Recommendations: ${JSON.stringify(
          recommendations.slice(0, 60).map(
            (recommendation, index) => ({
              sequence: index + 1,
              recommendationType:
                recommendation.recommendationType,
              title: recommendation.title,
              priority: recommendation.priority,
              riskLevel: recommendation.riskLevel,
              estimatedSavingsUsd:
                recommendation.estimatedSavingsUsd,
              estimatedExposureUsd:
                recommendation.estimatedExposureUsd,
              confidence: recommendation.confidence,
              evidence: recommendation.evidence,
            }),
          ),
        )}`,
      ].join("\n"),
    });

    await prisma.autonomousProcurementRecommendationSet.update({
      where: { id: set.id },
      data: {
        aiExecutionId: ai.id,
        aiNarrative: ai.outputText,
      },
    });
  } catch (error) {
    await prisma.autonomousProcurementRecommendationSet.update({
      where: { id: set.id },
      data: {
        aiError:
          error instanceof Error
            ? error.message
            : "Governed AI recommendation review failed.",
      },
    });
  }

  return {
    set,
    recommendationCount: recommendations.length,
  };
}
