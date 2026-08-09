import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPredictionCalibrationAnalytics } from "@/core/closed-loop-procurement/calibration";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function priorityFromGap(gap: number) {
  const absolute = Math.abs(gap);
  if (absolute >= 25) return "HIGH";
  if (absolute >= 15) return "MEDIUM";
  return "LOW";
}

function thresholdProposal(
  averageConfidence: number,
  observedAccuracy: number,
) {
  if (averageConfidence <= 0) return null;

  const gap = averageConfidence - observedAccuracy;

  if (Math.abs(gap) < 10) {
    return null;
  }

  const proposedValue =
    gap > 0
      ? Math.max(0, averageConfidence - Math.min(20, Math.abs(gap)))
      : Math.min(100, averageConfidence + Math.min(20, Math.abs(gap)));

  return {
    currentValue: averageConfidence,
    proposedValue,
    gap,
  };
}

export async function generateClosedLoopLearningProposals(
  tenantId: string,
) {
  const analytics =
    await getPredictionCalibrationAnalytics(tenantId);

  let created = 0;

  for (const bucket of analytics.calibration) {
    if (bucket.count < 5) continue;

    const proposal = thresholdProposal(
      bucket.averageConfidence,
      bucket.observedAccuracy,
    );

    if (!proposal) continue;

    const scopeKey = `CONFIDENCE_BUCKET:${bucket.bucket}`;

    const existing =
      await prisma.closedLoopLearningProposal.findFirst({
        where: {
          tenantId,
          proposalType: "CONFIDENCE_THRESHOLD",
          scopeKey,
          status: {
            in: ["DRAFT", "APPROVED"],
          },
        },
        select: { id: true },
      });

    if (existing) continue;

    const direction =
      proposal.gap > 0 ? "reduce" : "increase";

    await prisma.closedLoopLearningProposal.create({
      data: {
        tenantId,
        proposalType: "CONFIDENCE_THRESHOLD",
        scopeKey,
        scopeLabel: `Confidence bucket ${bucket.bucket}`,
        status: "DRAFT",
        priority: priorityFromGap(proposal.gap),
        title: `${direction === "reduce" ? "Reduce" : "Increase"} confidence threshold for bucket ${bucket.bucket}`,
        rationale:
          `Validated outcomes show average confidence of ${bucket.averageConfidence.toFixed(1)}% versus observed accuracy of ${bucket.observedAccuracy.toFixed(1)}%, a calibration gap of ${proposal.gap.toFixed(1)} percentage points.`,
        currentValue: proposal.currentValue,
        proposedValue: proposal.proposedValue,
        confidence: Math.min(
          100,
          50 + Math.min(50, bucket.count * 2),
        ),
        evidenceCount: bucket.count,
        evidenceSnapshot: json(bucket),
        createdBySystem: true,
      },
    });

    created += 1;
  }

  for (const metric of analytics.metricPerformance) {
    if (metric.count < 5) continue;

    if (metric.meanAbsolutePercentageError < 25) {
      continue;
    }

    const scopeKey = `METRIC:${metric.metricKey}`;

    const existing =
      await prisma.closedLoopLearningProposal.findFirst({
        where: {
          tenantId,
          proposalType: "PREDICTION_RULE_REVIEW",
          scopeKey,
          status: {
            in: ["DRAFT", "APPROVED"],
          },
        },
        select: { id: true },
      });

    if (existing) continue;

    await prisma.closedLoopLearningProposal.create({
      data: {
        tenantId,
        proposalType: "PREDICTION_RULE_REVIEW",
        scopeKey,
        scopeLabel: metric.label,
        status: "DRAFT",
        priority:
          metric.meanAbsolutePercentageError >= 50
            ? "HIGH"
            : "MEDIUM",
        title: `Review prediction logic for ${metric.label}`,
        rationale:
          `${metric.label} has ${metric.count} validated observations with mean absolute percentage error of ${metric.meanAbsolutePercentageError.toFixed(1)}%. The prediction logic should be reviewed before additional autonomous reliance.`,
        currentValue:
          metric.meanAbsolutePercentageError,
        proposedValue: null,
        confidence: Math.min(
          100,
          50 + Math.min(50, metric.count * 2),
        ),
        evidenceCount: metric.count,
        evidenceSnapshot: json(metric),
        createdBySystem: true,
      },
    });

    created += 1;
  }

  for (const workflow of analytics.workflowPerformance) {
    if (workflow.outcomes < 5) continue;

    if (workflow.recommendationEffectiveness >= 60) {
      continue;
    }

    const scopeKey = `WORKFLOW:${workflow.workflow}`;

    const existing =
      await prisma.closedLoopLearningProposal.findFirst({
        where: {
          tenantId,
          proposalType: "WORKFLOW_RECOMMENDATION_REVIEW",
          scopeKey,
          status: {
            in: ["DRAFT", "APPROVED"],
          },
        },
        select: { id: true },
      });

    if (existing) continue;

    await prisma.closedLoopLearningProposal.create({
      data: {
        tenantId,
        proposalType: "WORKFLOW_RECOMMENDATION_REVIEW",
        scopeKey,
        scopeLabel: workflow.workflow,
        status: "DRAFT",
        priority:
          workflow.recommendationEffectiveness < 40
            ? "HIGH"
            : "MEDIUM",
        title: `Review autonomous recommendations for ${workflow.workflow.replaceAll("_", " ")}`,
        rationale:
          `${workflow.outcomes} validated outcomes show recommendation effectiveness of ${workflow.recommendationEffectiveness.toFixed(1)}%. The workflow recommendation rules should be reviewed before increasing autonomous reliance.`,
        currentValue:
          workflow.recommendationEffectiveness,
        proposedValue: null,
        confidence: Math.min(
          100,
          50 + Math.min(50, workflow.outcomes * 2),
        ),
        evidenceCount: workflow.outcomes,
        evidenceSnapshot: json(workflow),
        createdBySystem: true,
      },
    });

    created += 1;
  }

  return {
    created,
  };
}

export async function decideClosedLoopLearningProposal(input: {
  tenantId: string;
  userId: string;
  proposalId: string;
  decision: "APPROVE" | "REJECT";
  note: string | null;
}) {
  const proposal =
    await prisma.closedLoopLearningProposal.findFirstOrThrow({
      where: {
        id: input.proposalId,
        tenantId: input.tenantId,
      },
    });

  if (proposal.status !== "DRAFT") {
    throw new Error(
      "Only DRAFT learning proposals can be reviewed.",
    );
  }

  return prisma.closedLoopLearningProposal.update({
    where: { id: proposal.id },
    data:
      input.decision === "APPROVE"
        ? {
            status: "APPROVED",
            reviewedByUserId: input.userId,
            reviewedAt: new Date(),
            decisionNote: input.note,
            approvedAt: new Date(),
          }
        : {
            status: "REJECTED",
            reviewedByUserId: input.userId,
            reviewedAt: new Date(),
            decisionNote: input.note,
            rejectedAt: new Date(),
          },
  });
}
