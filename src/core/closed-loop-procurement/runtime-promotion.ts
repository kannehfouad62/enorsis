import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensurePredictiveProcurementAdoption,
  updateRuntimePolicyAdoption,
} from "@/core/closed-loop-procurement/runtime-adoption";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function percent(numerator: number, denominator: number) {
  return denominator === 0
    ? 0
    : (numerator / denominator) * 100;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export async function ensureRuntimeRollbackRule(
  tenantId: string,
) {
  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);

  const existing =
    await prisma.closedLoopRuntimeRollbackRule.findFirst({
      where: {
        tenantId,
        adoptionId: adoption.id,
      },
    });

  if (existing) return existing;

  return prisma.closedLoopRuntimeRollbackRule.create({
    data: {
      tenantId,
      adoptionId: adoption.id,
      decisionPath: adoption.decisionPath,
      maximumDivergenceRate: 20,
      maximumFallbackRate: 25,
      maximumDeniedRate: 50,
      minimumDecisionCount: 20,
      autoRollbackEnabled: false,
      status: "ACTIVE",
    },
  });
}

export async function generateRuntimePromotionAssessment(
  tenantId: string,
) {
  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);

  const rollbackRule =
    await ensureRuntimeRollbackRule(tenantId);

  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: {
        tenantId,
        decisionType:
          "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

  const total = traces.length;

  const shadowDifferent =
    adoption.shadowDifferenceCount;

  const divergenceRate =
    percent(
      shadowDifferent,
      Math.max(1, adoption.decisionCount),
    );

  const fallbackCount = traces.filter(
    (trace) => trace.policySource === "DEFAULT",
  ).length;

  const fallbackRate =
    percent(fallbackCount, total);

  const clampedDecisionCount =
    traces.filter(
      (trace) => trace.wasClamped,
    ).length;

  const deniedDecisionCount =
    traces.filter(
      (trace) => trace.decisionResult === false,
    ).length;

  const blockers: string[] = [];

  if (adoption.mode !== "SHADOW") {
    blockers.push(
      "Adoption mode must be SHADOW before promotion to ENFORCED.",
    );
  }

  if (
    adoption.decisionCount <
    rollbackRule.minimumDecisionCount
  ) {
    blockers.push(
      `At least ${rollbackRule.minimumDecisionCount} shadow decisions are required.`,
    );
  }

  if (
    divergenceRate >
    rollbackRule.maximumDivergenceRate
  ) {
    blockers.push(
      `Observed shadow divergence ${divergenceRate.toFixed(1)}% exceeds the ${rollbackRule.maximumDivergenceRate.toFixed(1)}% ceiling.`,
    );
  }

  if (
    fallbackRate >
    rollbackRule.maximumFallbackRate
  ) {
    blockers.push(
      `Runtime fallback rate ${fallbackRate.toFixed(1)}% exceeds the ${rollbackRule.maximumFallbackRate.toFixed(1)}% ceiling.`,
    );
  }

  if (clampedDecisionCount > 0) {
    blockers.push(
      "One or more runtime policy values required clamping.",
    );
  }

  const sampleScore = clamp(
    percent(
      Math.min(
        adoption.decisionCount,
        rollbackRule.minimumDecisionCount,
      ),
      rollbackRule.minimumDecisionCount,
    ),
  );

  const divergenceScore = clamp(
    100 -
      percent(
        divergenceRate,
        Math.max(
          1,
          rollbackRule.maximumDivergenceRate,
        ),
      ) *
        100,
  );

  const fallbackScore = clamp(
    100 -
      percent(
        fallbackRate,
        Math.max(
          1,
          rollbackRule.maximumFallbackRate,
        ),
      ) *
        100,
  );

  const clampScore =
    clampedDecisionCount === 0 ? 100 : 0;

  const readinessScore =
    sampleScore * 0.35 +
    divergenceScore * 0.3 +
    fallbackScore * 0.2 +
    clampScore * 0.15;

  const eligible =
    blockers.length === 0 &&
    readinessScore >= 80;

  return prisma.closedLoopRuntimePromotionAssessment.create({
    data: {
      tenantId,
      adoptionId: adoption.id,
      decisionPath: adoption.decisionPath,
      status: "DRAFT",
      currentMode: adoption.mode,
      recommendedMode:
        eligible ? "ENFORCED" : "SHADOW",
      readinessScore,
      minimumDecisionCount:
        rollbackRule.minimumDecisionCount,
      observedDecisionCount:
        adoption.decisionCount,
      maximumDivergenceRate:
        rollbackRule.maximumDivergenceRate,
      observedDivergenceRate:
        divergenceRate,
      fallbackRate,
      clampedDecisionCount,
      deniedDecisionCount,
      eligible,
      blockers: json(blockers),
      evidenceSnapshot: json({
        adoption: {
          id: adoption.id,
          mode: adoption.mode,
          decisionCount:
            adoption.decisionCount,
          shadowDifferenceCount:
            adoption.shadowDifferenceCount,
          lastDecisionAt:
            adoption.lastDecisionAt,
        },
        rollbackRule: {
          maximumDivergenceRate:
            rollbackRule.maximumDivergenceRate,
          maximumFallbackRate:
            rollbackRule.maximumFallbackRate,
          maximumDeniedRate:
            rollbackRule.maximumDeniedRate,
          minimumDecisionCount:
            rollbackRule.minimumDecisionCount,
          autoRollbackEnabled:
            rollbackRule.autoRollbackEnabled,
        },
        traceSummary: {
          total,
          fallbackCount,
          clampedDecisionCount,
          deniedDecisionCount,
        },
      }),
    },
  });
}

export async function promoteRuntimeAdoption(input: {
  tenantId: string;
  userId: string;
  assessmentId: string;
  note: string | null;
}) {
  const assessment =
    await prisma.closedLoopRuntimePromotionAssessment.findFirstOrThrow({
      where: {
        id: input.assessmentId,
        tenantId: input.tenantId,
      },
    });

  if (assessment.status !== "DRAFT") {
    throw new Error(
      "Only DRAFT promotion assessments can be reviewed.",
    );
  }

  if (!assessment.eligible) {
    throw new Error(
      "This assessment is not eligible for ENFORCED promotion.",
    );
  }

  const adoption =
    await prisma.closedLoopRuntimePolicyAdoption.findFirstOrThrow({
      where: {
        id: assessment.adoptionId,
        tenantId: input.tenantId,
      },
    });

  if (adoption.mode !== "SHADOW") {
    throw new Error(
      "Runtime adoption must still be in SHADOW mode at promotion time.",
    );
  }

  await updateRuntimePolicyAdoption({
    tenantId: input.tenantId,
    userId: input.userId,
    decisionPath: adoption.decisionPath,
    mode: "ENFORCED",
    rationale:
      input.note ??
      `Promoted from SHADOW using B12.9 assessment ${assessment.id}.`,
  });

  return prisma.closedLoopRuntimePromotionAssessment.update({
    where: { id: assessment.id },
    data: {
      status: "PROMOTED",
      reviewedByUserId: input.userId,
      reviewedAt: new Date(),
      decisionNote: input.note,
      promotedAt: new Date(),
    },
  });
}

export async function rejectRuntimePromotion(input: {
  tenantId: string;
  userId: string;
  assessmentId: string;
  note: string | null;
}) {
  const assessment =
    await prisma.closedLoopRuntimePromotionAssessment.findFirstOrThrow({
      where: {
        id: input.assessmentId,
        tenantId: input.tenantId,
      },
    });

  if (assessment.status !== "DRAFT") {
    throw new Error(
      "Only DRAFT promotion assessments can be rejected.",
    );
  }

  return prisma.closedLoopRuntimePromotionAssessment.update({
    where: { id: assessment.id },
    data: {
      status: "REJECTED",
      reviewedByUserId: input.userId,
      reviewedAt: new Date(),
      decisionNote: input.note,
      rejectedAt: new Date(),
    },
  });
}

export async function evaluateRuntimeRollbackReadiness(
  tenantId: string,
) {
  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);

  const rule =
    await ensureRuntimeRollbackRule(tenantId);

  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: {
        tenantId,
        decisionType:
          "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      },
      orderBy: { createdAt: "desc" },
      take: Math.max(
        rule.minimumDecisionCount,
        100,
      ),
    });

  const total = traces.length;

  const fallbackRate =
    percent(
      traces.filter(
        (trace) =>
          trace.policySource === "DEFAULT",
      ).length,
      total,
    );

  const deniedRate =
    percent(
      traces.filter(
        (trace) =>
          trace.decisionResult === false,
      ).length,
      total,
    );

  const divergenceRate =
    percent(
      adoption.shadowDifferenceCount,
      Math.max(1, adoption.decisionCount),
    );

  const reasons: string[] = [];

  if (
    adoption.mode === "ENFORCED" &&
    total >= rule.minimumDecisionCount
  ) {
    if (
      divergenceRate >
      rule.maximumDivergenceRate
    ) {
      reasons.push(
        `Divergence rate ${divergenceRate.toFixed(1)}% exceeds ${rule.maximumDivergenceRate.toFixed(1)}%.`,
      );
    }

    if (
      fallbackRate >
      rule.maximumFallbackRate
    ) {
      reasons.push(
        `Fallback rate ${fallbackRate.toFixed(1)}% exceeds ${rule.maximumFallbackRate.toFixed(1)}%.`,
      );
    }

    if (
      deniedRate >
      rule.maximumDeniedRate
    ) {
      reasons.push(
        `Denied decision rate ${deniedRate.toFixed(1)}% exceeds ${rule.maximumDeniedRate.toFixed(1)}%.`,
      );
    }
  }

  return {
    adoption,
    rule,
    metrics: {
      total,
      divergenceRate,
      fallbackRate,
      deniedRate,
    },
    rollbackRecommended:
      reasons.length > 0,
    reasons,
  };
}
