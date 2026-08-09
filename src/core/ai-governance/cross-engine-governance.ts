import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ConflictCandidate = {
  conflictType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  scopeKey: string;
  scopeLabel: string;
  title: string;
  rationale: string;
  precedenceRule: string;
  recommendedAction: string;
  evidence: Prisma.InputJsonValue;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function riskRank(value: string) {
  return value === "CRITICAL"
    ? 4
    : value === "HIGH"
      ? 3
      : value === "MEDIUM"
        ? 2
        : 1;
}

function isElevated(value: string) {
  return riskRank(value) >= 3;
}

function alignmentScore(conflicts: ConflictCandidate[]) {
  if (conflicts.length === 0) return 100;

  const penalty = conflicts.reduce((sum, conflict) => {
    if (conflict.severity === "CRITICAL") return sum + 30;
    if (conflict.severity === "HIGH") return sum + 20;
    return sum + 10;
  }, 0);

  return Math.max(0, 100 - penalty);
}

export async function generateCrossEngineGovernanceAssessment(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const [procurementRun, inventoryRun, capacityRun] =
    await Promise.all([
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
    ]);

  const [procurementSignals, inventorySignals, capacitySignals] =
    await Promise.all([
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
          })
        : Promise.resolve([]),
      capacityRun
        ? prisma.predictiveCapacityPlanningSignal.findMany({
            where: {
              tenantId: input.tenantId,
              capacityRunId: capacityRun.id,
            },
          })
        : Promise.resolve([]),
    ]);

  const conflicts: ConflictCandidate[] = [];

  const enterpriseCapacity = capacitySignals.find(
    (signal) =>
      signal.scopeType === "ENTERPRISE" &&
      signal.scopeKey === "enterprise",
  );

  const urgentInventory = inventorySignals.filter(
    (signal) =>
      ["URGENT_REORDER", "REORDER"].includes(
        signal.recommendation,
      ),
  );

  const elevatedInventory = urgentInventory.filter(
    (signal) => isElevated(signal.riskLevel),
  );

  if (
    enterpriseCapacity &&
    isElevated(enterpriseCapacity.riskLevel) &&
    urgentInventory.length > 0
  ) {
    conflicts.push({
      conflictType: "CAPACITY_VS_REPLENISHMENT",
      severity:
        enterpriseCapacity.riskLevel === "CRITICAL" ||
        elevatedInventory.some(
          (signal) => signal.riskLevel === "CRITICAL",
        )
          ? "CRITICAL"
          : "HIGH",
      scopeKey: "enterprise",
      scopeLabel: "Enterprise inventory capacity",
      title:
        "Replenishment demand conflicts with constrained capacity",
      rationale:
        `${urgentInventory.length} inventory recommendation(s) call for replenishment while enterprise capacity is ${enterpriseCapacity.riskLevel}. Increasing inbound inventory without resolving capacity pressure may worsen congestion or storage constraints.`,
      precedenceRule: "CAPACITY_GUARDRAIL_BEFORE_REPLENISHMENT",
      recommendedAction:
        "Review location rebalancing, inbound staging, alternate receiving capacity or capacity expansion before approving high-volume replenishment.",
      evidence: json({
        capacity: {
          riskLevel: enterpriseCapacity.riskLevel,
          recommendation:
            enterpriseCapacity.recommendation,
          projectedUtilizationPct:
            Number(
              enterpriseCapacity.projectedUtilizationPct,
            ),
          capacityGapUnits:
            Number(enterpriseCapacity.capacityGapUnits),
          confidence:
            Number(enterpriseCapacity.confidence),
        },
        inventory: urgentInventory.slice(0, 25).map((signal) => ({
          inventoryItemId: signal.inventoryItemId,
          sku: signal.sku,
          itemName: signal.itemName,
          recommendation: signal.recommendation,
          riskLevel: signal.riskLevel,
          suggestedReorderQty:
            Number(signal.suggestedReorderQty),
          confidence: Number(signal.confidence),
        })),
      }),
    });
  }

  const growthSignals = procurementSignals.filter(
    (signal) =>
      ["SPEND_FORECAST", "DEMAND_FORECAST"].includes(
        signal.signalType,
      ) &&
      signal.changePercent !== null &&
      Number(signal.changePercent) > 0 &&
      isElevated(signal.riskLevel),
  );

  if (
    enterpriseCapacity &&
    isElevated(enterpriseCapacity.riskLevel) &&
    growthSignals.length > 0
  ) {
    conflicts.push({
      conflictType: "DEMAND_GROWTH_VS_CAPACITY",
      severity:
        enterpriseCapacity.riskLevel === "CRITICAL" ||
        growthSignals.some(
          (signal) => signal.riskLevel === "CRITICAL",
        )
          ? "CRITICAL"
          : "HIGH",
      scopeKey: "enterprise-demand-capacity",
      scopeLabel: "Enterprise demand and capacity",
      title:
        "Forecast demand growth conflicts with capacity headroom",
      rationale:
        `${growthSignals.length} elevated procurement demand signal(s) project growth while enterprise capacity is ${enterpriseCapacity.riskLevel}. Demand planning and capacity planning require a coordinated response.`,
      precedenceRule: "CAPACITY_AND_DEMAND_JOINT_REVIEW",
      recommendedAction:
        "Require a joint procurement, inventory and operations review before increasing committed inbound volume or accelerating sourcing activity.",
      evidence: json({
        capacity: {
          riskLevel: enterpriseCapacity.riskLevel,
          projectedUtilizationPct:
            Number(
              enterpriseCapacity.projectedUtilizationPct,
            ),
          recommendation:
            enterpriseCapacity.recommendation,
        },
        procurement: growthSignals.map((signal) => ({
          signalType: signal.signalType,
          scopeKey: signal.scopeKey,
          scopeLabel: signal.scopeLabel,
          changePercent:
            signal.changePercent === null
              ? null
              : Number(signal.changePercent),
          riskLevel: signal.riskLevel,
          confidence: Number(signal.confidence),
        })),
      }),
    });
  }

  const supplierRiskSignals = procurementSignals.filter(
    (signal) =>
      signal.signalType === "SUPPLIER_RISK_FORECAST" &&
      isElevated(signal.riskLevel),
  );

  if (
    supplierRiskSignals.length > 0 &&
    urgentInventory.length > 0
  ) {
    conflicts.push({
      conflictType: "SUPPLIER_RISK_VS_REPLENISHMENT",
      severity: supplierRiskSignals.some(
        (signal) => signal.riskLevel === "CRITICAL",
      )
        ? "CRITICAL"
        : "HIGH",
      scopeKey: "enterprise-supply-risk",
      scopeLabel: "Enterprise replenishment and supplier risk",
      title:
        "Replenishment urgency coincides with elevated supplier risk",
      rationale:
        `${urgentInventory.length} replenishment recommendation(s) coexist with ${supplierRiskSignals.length} elevated supplier-risk forecast(s). Replenishment urgency must not bypass supplier risk governance.`,
      precedenceRule: "SUPPLIER_RISK_REVIEW_BEFORE_COMMITMENT",
      recommendedAction:
        "Validate qualified alternate suppliers, sourcing resilience and supplier risk controls before committing replenishment volume.",
      evidence: json({
        supplierRisk: supplierRiskSignals.map((signal) => ({
          supplierId: signal.scopeKey,
          supplier: signal.scopeLabel,
          riskLevel: signal.riskLevel,
          forecastValue:
            signal.forecastValue === null
              ? null
              : Number(signal.forecastValue),
          confidence: Number(signal.confidence),
        })),
        urgentInventoryCount: urgentInventory.length,
        urgentInventory: urgentInventory.slice(0, 25).map((signal) => ({
          inventoryItemId: signal.inventoryItemId,
          sku: signal.sku,
          recommendation: signal.recommendation,
          riskLevel: signal.riskLevel,
        })),
      }),
    });
  }

  const criticalEngines = [
    {
      engine: "PROCUREMENT",
      critical: procurementSignals.some(
        (signal) => signal.riskLevel === "CRITICAL",
      ),
    },
    {
      engine: "INVENTORY",
      critical: inventorySignals.some(
        (signal) => signal.riskLevel === "CRITICAL",
      ),
    },
    {
      engine: "CAPACITY",
      critical: capacitySignals.some(
        (signal) => signal.riskLevel === "CRITICAL",
      ),
    },
  ].filter((item) => item.critical);

  if (criticalEngines.length >= 2) {
    conflicts.push({
      conflictType: "MULTI_ENGINE_CRITICAL_ESCALATION",
      severity: "CRITICAL",
      scopeKey: "enterprise-multi-engine",
      scopeLabel: "Enterprise intelligence posture",
      title:
        "Multiple intelligence engines report critical conditions",
      rationale:
        `${criticalEngines.length} governed intelligence engines simultaneously report CRITICAL conditions. No single-engine recommendation should be executed in isolation.`,
      precedenceRule: "EXECUTIVE_MULTI_ENGINE_REVIEW",
      recommendedAction:
        "Escalate to a cross-functional executive review and require coordinated approval before high-impact procurement or inventory actions.",
      evidence: json({
        criticalEngines,
        counts: {
          procurementSignals: procurementSignals.length,
          inventorySignals: inventorySignals.length,
          capacitySignals: capacitySignals.length,
        },
      }),
    });
  }

  const criticalCount = conflicts.filter(
    (conflict) => conflict.severity === "CRITICAL",
  ).length;
  const highCount = conflicts.filter(
    (conflict) => conflict.severity === "HIGH",
  ).length;
  const mediumCount = conflicts.filter(
    (conflict) => conflict.severity === "MEDIUM",
  ).length;

  const assessment =
    await prisma.crossEngineGovernanceAssessment.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.userId ?? null,
        procurementRunId: procurementRun?.id ?? null,
        inventoryRunId: inventoryRun?.id ?? null,
        capacityRunId: capacityRun?.id ?? null,
        conflictCount: conflicts.length,
        criticalCount,
        highCount,
        mediumCount,
        alignmentScore: alignmentScore(conflicts),
        summary: json({
          signalCounts: {
            procurement: procurementSignals.length,
            inventory: inventorySignals.length,
            capacity: capacitySignals.length,
          },
          conflictTypes: conflicts.map(
            (conflict) => conflict.conflictType,
          ),
          generatedAt: new Date().toISOString(),
          note:
            "Cross-engine governance is advisory and does not execute or suppress operational transactions.",
        }),
      },
    });

  if (conflicts.length > 0) {
    await prisma.crossEngineGovernanceConflict.createMany({
      data: conflicts.map((conflict) => ({
        tenantId: input.tenantId,
        assessmentId: assessment.id,
        conflictType: conflict.conflictType,
        severity: conflict.severity,
        scopeKey: conflict.scopeKey,
        scopeLabel: conflict.scopeLabel,
        status: "OPEN",
        title: conflict.title,
        rationale: conflict.rationale,
        precedenceRule: conflict.precedenceRule,
        recommendedAction: conflict.recommendedAction,
        evidence: conflict.evidence,
      })),
    });
  }

  return assessment;
}

export async function resolveCrossEngineConflict(input: {
  tenantId: string;
  userId: string;
  conflictId: string;
  resolutionNote: string;
}) {
  const conflict =
    await prisma.crossEngineGovernanceConflict.findFirstOrThrow({
      where: {
        id: input.conflictId,
        tenantId: input.tenantId,
      },
    });

  if (conflict.status === "RESOLVED") {
    return conflict;
  }

  return prisma.crossEngineGovernanceConflict.update({
    where: { id: conflict.id },
    data: {
      status: "RESOLVED",
      acknowledgedByUserId:
        conflict.acknowledgedByUserId ?? input.userId,
      acknowledgedAt:
        conflict.acknowledgedAt ?? new Date(),
      resolvedByUserId: input.userId,
      resolvedAt: new Date(),
      resolutionNote: input.resolutionNote,
    },
  });
}
