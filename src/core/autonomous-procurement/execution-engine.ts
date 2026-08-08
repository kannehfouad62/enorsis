import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

function executionMapping(actionType: string) {
  if (actionType === "REPLENISH_INVENTORY") {
    return {
      executionType: "CREATE_PURCHASE_REQUEST",
      targetWorkflow: "PURCHASE_REQUEST",
    };
  }

  if (actionType === "REBALANCE_CAPACITY") {
    return {
      executionType: "CREATE_INVENTORY_ACTION",
      targetWorkflow: "INVENTORY_REBALANCE",
    };
  }

  if (actionType === "MITIGATE_SCENARIO_RISK") {
    return {
      executionType: "CREATE_RISK_ACTION",
      targetWorkflow: "RISK_MITIGATION",
    };
  }

  return {
    executionType: "CREATE_REVIEW_ACTION",
    targetWorkflow: "GOVERNED_REVIEW",
  };
}

function recommendationExecutionMapping(
  recommendationType: string,
) {
  if (recommendationType === "STRATEGY_RECOMMENDATION") {
    return {
      executionType: "CREATE_SOURCING_REVIEW",
      targetWorkflow: "STRATEGIC_SOURCING",
    };
  }

  if (recommendationType === "SAVINGS_OPPORTUNITY") {
    return {
      executionType: "CREATE_SAVINGS_ACTION",
      targetWorkflow: "VALUE_REALIZATION",
    };
  }

  return {
    executionType: "CREATE_RISK_ACTION",
    targetWorkflow: "RISK_MITIGATION",
  };
}

type PolicyCheck = {
  policyKey: string;
  policyLabel: string;
  result: string;
  severity: string;
  blocking: boolean;
  rationale: string;
  evidence: Prisma.InputJsonValue;
};

function buildPolicyChecks(input: {
  sourceApproved: boolean;
  valueUsd: number | null;
  supplierId: string | null;
  riskLevel: string;
  confidence: number;
  targetWorkflow: string;
}) {
  const checks: PolicyCheck[] = [];

  checks.push({
    policyKey: "SOURCE_HUMAN_APPROVAL",
    policyLabel: "Source human approval",
    result: input.sourceApproved ? "PASS" : "FAIL",
    severity: input.sourceApproved ? "LOW" : "CRITICAL",
    blocking: !input.sourceApproved,
    rationale: input.sourceApproved
      ? "The source plan or recommendation has an explicit human approval/disposition."
      : "Execution cannot advance because the source is not explicitly human approved.",
    evidence: {
      sourceApproved: input.sourceApproved,
    },
  });

  const valueRequiresExecutive =
    input.valueUsd !== null && input.valueUsd >= 100000;

  checks.push({
    policyKey: "HIGH_VALUE_EXECUTIVE_REVIEW",
    policyLabel: "High-value executive review",
    result: valueRequiresExecutive
      ? "REVIEW_REQUIRED"
      : "PASS",
    severity: valueRequiresExecutive ? "HIGH" : "LOW",
    blocking: false,
    rationale: valueRequiresExecutive
      ? "The proposed value is at or above $100,000 and requires explicit executive release before handoff."
      : "The proposed value is below the B9.3 high-value review threshold.",
    evidence: {
      proposedValueUsd: input.valueUsd,
      thresholdUsd: 100000,
    },
  });

  const risky =
    input.riskLevel === "CRITICAL" ||
    input.riskLevel === "HIGH";

  checks.push({
    policyKey: "RISK_REVIEW",
    policyLabel: "High-risk execution review",
    result: risky ? "REVIEW_REQUIRED" : "PASS",
    severity: risky ? input.riskLevel : "LOW",
    blocking: false,
    rationale: risky
      ? "High-risk recommendations require explicit release rationale and must not bypass human governance."
      : "Risk level does not require enhanced review.",
    evidence: {
      riskLevel: input.riskLevel,
    },
  });

  const lowConfidence = input.confidence < 60;

  checks.push({
    policyKey: "CONFIDENCE_THRESHOLD",
    policyLabel: "Recommendation confidence",
    result: lowConfidence ? "REVIEW_REQUIRED" : "PASS",
    severity: lowConfidence ? "MEDIUM" : "LOW",
    blocking: false,
    rationale: lowConfidence
      ? "Recommendation confidence is below 60% and requires additional human validation."
      : "Recommendation confidence meets the minimum planning threshold.",
    evidence: {
      confidence: input.confidence,
      threshold: 60,
    },
  });

  const supplierNeeded =
    input.targetWorkflow === "PURCHASE_REQUEST" ||
    input.targetWorkflow === "STRATEGIC_SOURCING";

  checks.push({
    policyKey: "SUPPLIER_REFERENCE",
    policyLabel: "Supplier reference readiness",
    result:
      supplierNeeded && !input.supplierId
        ? "REVIEW_REQUIRED"
        : "PASS",
    severity:
      supplierNeeded && !input.supplierId
        ? "MEDIUM"
        : "LOW",
    blocking: false,
    rationale:
      supplierNeeded && !input.supplierId
        ? "No supplier is preselected. This is allowed, but sourcing must establish supplier eligibility before award or order."
        : "Supplier reference is available or not required for this workflow.",
    evidence: {
      supplierNeeded,
      proposedSupplierId: input.supplierId,
    },
  });

  return checks;
}

export async function createExecutionEnvelopeFromPlanAction(
  input: {
    tenantId: string;
    userId: string;
    planActionId: string;
  },
) {
  const action =
    await prisma.autonomousProcurementPlanAction.findFirstOrThrow(
      {
        where: {
          id: input.planActionId,
          tenantId: input.tenantId,
        },
      },
    );

  const plan =
    await prisma.autonomousProcurementPlan.findFirstOrThrow({
      where: {
        id: action.planId,
        tenantId: input.tenantId,
      },
    });

  if (plan.status !== "APPROVED") {
    throw new Error(
      "Only actions from approved procurement plans can enter controlled execution.",
    );
  }

  const mapping = executionMapping(action.actionType);
  const valueUsd =
    action.proposedValueUsd === null
      ? null
      : Number(action.proposedValueUsd);
  const confidence = Number(action.confidence);

  const checks = buildPolicyChecks({
    sourceApproved: true,
    valueUsd,
    supplierId: action.proposedSupplierId,
    riskLevel: action.riskLevel,
    confidence,
    targetWorkflow: mapping.targetWorkflow,
  });

  const blockingChecks = checks.filter(
    (check) => check.blocking && check.result !== "PASS",
  );

  const reviewChecks = checks.filter(
    (check) => check.result === "REVIEW_REQUIRED",
  );

  const readinessSummary: Prisma.InputJsonValue = {
    blockingCheckCount: blockingChecks.length,
    reviewRequiredCount: reviewChecks.length,
    policyCheckCount: checks.length,
    readyForHumanRelease: blockingChecks.length === 0,
    executionMode: "CONTROLLED_HANDOFF_ONLY",
  };

  const envelope =
    await prisma.autonomousExecutionEnvelope.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.userId,
        sourceType: "PLAN_ACTION",
        sourceId: action.id,
        sourceLabel: action.resourceLabel,
        executionType: mapping.executionType,
        targetWorkflow: mapping.targetWorkflow,
        status:
          blockingChecks.length > 0
            ? "BLOCKED"
            : "PENDING_HUMAN_RELEASE",
        riskLevel: action.riskLevel,
        proposedValueUsd: valueUsd,
        proposedQuantity:
          action.proposedQuantity === null
            ? null
            : Number(action.proposedQuantity),
        proposedSupplierId: action.proposedSupplierId,
        executionPayload: {
          sourcePlanId: plan.id,
          sourcePlanActionId: action.id,
          actionType: action.actionType,
          resourceType: action.resourceType,
          resourceId: action.resourceId,
          resourceLabel: action.resourceLabel,
          proposedQuantity:
            action.proposedQuantity === null
              ? null
              : Number(action.proposedQuantity),
          proposedValueUsd: valueUsd,
          proposedSupplierId: action.proposedSupplierId,
          recommendation: action.recommendation,
          note:
            "Payload is staged for controlled handoff only and does not create a live transaction.",
        },
        policySnapshot: {
          policyVersion: "B9.3_V1",
          highValueThresholdUsd: 100000,
          confidenceReviewThreshold: 60,
          mandatoryHumanRelease: true,
        },
        readinessSummary,
        requiresHumanRelease: true,
      },
    });

  await prisma.autonomousExecutionPolicyCheck.createMany({
    data: checks.map((check) => ({
      tenantId: input.tenantId,
      executionEnvelopeId: envelope.id,
      ...check,
    })),
  });

  return envelope;
}

export async function createExecutionEnvelopeFromRecommendation(
  input: {
    tenantId: string;
    userId: string;
    recommendationId: string;
  },
) {
  const recommendation =
    await prisma.autonomousProcurementRecommendation.findFirstOrThrow(
      {
        where: {
          id: input.recommendationId,
          tenantId: input.tenantId,
        },
      },
    );

  if (recommendation.status !== "ACCEPTED") {
    throw new Error(
      "Only human-accepted recommendations can enter controlled execution.",
    );
  }

  const mapping = recommendationExecutionMapping(
    recommendation.recommendationType,
  );

  const valueUsd =
    recommendation.estimatedExposureUsd === null
      ? recommendation.estimatedSavingsUsd === null
        ? null
        : Number(recommendation.estimatedSavingsUsd)
      : Number(recommendation.estimatedExposureUsd);

  const confidence = Number(recommendation.confidence);

  const checks = buildPolicyChecks({
    sourceApproved: true,
    valueUsd,
    supplierId: null,
    riskLevel: recommendation.riskLevel,
    confidence,
    targetWorkflow: mapping.targetWorkflow,
  });

  const blockingChecks = checks.filter(
    (check) => check.blocking && check.result !== "PASS",
  );

  const reviewChecks = checks.filter(
    (check) => check.result === "REVIEW_REQUIRED",
  );

  const envelope =
    await prisma.autonomousExecutionEnvelope.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.userId,
        sourceType: "RECOMMENDATION",
        sourceId: recommendation.id,
        sourceLabel: recommendation.title,
        executionType: mapping.executionType,
        targetWorkflow: mapping.targetWorkflow,
        status:
          blockingChecks.length > 0
            ? "BLOCKED"
            : "PENDING_HUMAN_RELEASE",
        riskLevel: recommendation.riskLevel,
        proposedValueUsd: valueUsd,
        proposedQuantity: null,
        proposedSupplierId: null,
        executionPayload: {
          recommendationId: recommendation.id,
          recommendationSetId:
            recommendation.recommendationSetId,
          recommendationType:
            recommendation.recommendationType,
          title: recommendation.title,
          description: recommendation.description,
          resourceType: recommendation.resourceType,
          resourceId: recommendation.resourceId,
          resourceLabel: recommendation.resourceLabel,
          estimatedSavingsUsd:
            recommendation.estimatedSavingsUsd === null
              ? null
              : Number(
                  recommendation.estimatedSavingsUsd,
                ),
          estimatedExposureUsd:
            recommendation.estimatedExposureUsd === null
              ? null
              : Number(
                  recommendation.estimatedExposureUsd,
                ),
          note:
            "Accepted recommendation is staged for controlled handoff only. No live transaction is created.",
        },
        policySnapshot: {
          policyVersion: "B9.3_V1",
          highValueThresholdUsd: 100000,
          confidenceReviewThreshold: 60,
          mandatoryHumanRelease: true,
        },
        readinessSummary: {
          blockingCheckCount: blockingChecks.length,
          reviewRequiredCount: reviewChecks.length,
          policyCheckCount: checks.length,
          readyForHumanRelease: blockingChecks.length === 0,
          executionMode: "CONTROLLED_HANDOFF_ONLY",
        },
        requiresHumanRelease: true,
      },
    });

  await prisma.autonomousExecutionPolicyCheck.createMany({
    data: checks.map((check) => ({
      tenantId: input.tenantId,
      executionEnvelopeId: envelope.id,
      ...check,
    })),
  });

  return envelope;
}

export async function releaseExecutionEnvelope(input: {
  tenantId: string;
  userId: string;
  envelopeId: string;
  reason: string | null;
}) {
  const envelope =
    await prisma.autonomousExecutionEnvelope.findFirstOrThrow({
      where: {
        id: input.envelopeId,
        tenantId: input.tenantId,
      },
    });

  if (envelope.status !== "PENDING_HUMAN_RELEASE") {
    throw new Error(
      "Only execution envelopes pending human release can be released.",
    );
  }

  const checks =
    await prisma.autonomousExecutionPolicyCheck.findMany({
      where: {
        tenantId: input.tenantId,
        executionEnvelopeId: envelope.id,
      },
    });

  const blocking = checks.filter(
    (check) =>
      check.blocking && check.result !== "PASS",
  );

  if (blocking.length > 0) {
    throw new Error(
      "Execution envelope contains blocking policy failures.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const handoff =
      await tx.autonomousExecutionHandoff.create({
        data: {
          tenantId: input.tenantId,
          executionEnvelopeId: envelope.id,
          targetWorkflow: envelope.targetWorkflow,
          handoffMode: "CONTROLLED",
          status: "READY_FOR_HANDOFF",
          payload: JSON.parse(JSON.stringify(envelope.executionPayload)) as Prisma.InputJsonValue,
          createdByUserId: input.userId,
        },
      });

    await tx.autonomousExecutionEnvelope.update({
      where: { id: envelope.id },
      data: {
        status: "RELEASED",
        releasedByUserId: input.userId,
        releasedAt: new Date(),
        handoffStatus: "READY_FOR_HANDOFF",
        handoffReference: handoff.id,
      },
    });

    await tx.autonomousExecutionDecision.create({
      data: {
        tenantId: input.tenantId,
        executionEnvelopeId: envelope.id,
        decision: "RELEASED",
        decidedByUserId: input.userId,
        reason: input.reason,
        evidence: {
          policyCheckIds: checks.map((check) => check.id),
          blockingPolicyFailures: 0,
          handoffId: handoff.id,
          targetWorkflow: envelope.targetWorkflow,
          liveTransactionCreated: false,
        },
      },
    });

    return handoff;
  });
}
