import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { evaluateExecutiveInsightRules } from "./rules";

const ENGINE_VERSION = "B2.8.5.1-deterministic";

export async function runGovernedExecutiveInsightEngine(input: {
  tenantId: string;
  actorUserId?: string | null;
}) {
  const count = await prisma.governedExecutiveInsightRun.count({
    where: { tenantId: input.tenantId },
  });

  const run = await prisma.governedExecutiveInsightRun.create({
    data: {
      tenantId: input.tenantId,
      runNumber: `AI-EXEC-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(7, "0")}`,
      status: "RUNNING",
      engineVersion: ENGINE_VERSION,
      scope: "ENTERPRISE_EXECUTIVE_ANALYTICS",
      startedAt: new Date(),
      initiatedByUserId: input.actorUserId ?? null,
    },
  });

  try {
    const candidates = await evaluateExecutiveInsightRules({
      tenantId: input.tenantId,
    });

    for (const candidate of candidates) {
      await prisma.governedExecutiveInsight.create({
        data: {
          tenantId: input.tenantId,
          insightRunId: run.id,
          insightKey: candidate.insightKey,
          type: candidate.type,
          severity: candidate.severity,
          title: candidate.title,
          executiveSummary: candidate.executiveSummary,
          explanation: candidate.explanation,
          recommendation: candidate.recommendation ?? null,
          confidenceScore: candidate.confidenceScore,
          domain: candidate.domain,
          category: candidate.category ?? null,
          sourceModule: candidate.sourceModule,
          calculationVersion: ENGINE_VERSION,
          requiresHumanReview: candidate.requiresHumanReview ?? false,
          evidence: {
            create: candidate.evidence.map((item) => ({
              tenantId: input.tenantId,
              metricKey: item.metricKey ?? null,
              sourceType: item.sourceType,
              sourceId: item.sourceId ?? null,
              label: item.label,
              observedValue: item.observedValue ?? null,
              expectedValue: item.expectedValue ?? null,
              evidence: toJson(item.evidence ?? {}),
            })),
          },
        },
      });
    }

    const criticalCount = candidates.filter(
      (item) => item.severity === "CRITICAL",
    ).length;

    const completed =
      await prisma.governedExecutiveInsightRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          insightCount: candidates.length,
          warningCount: criticalCount,
          summary: toJson({
            insightCount: candidates.length,
            criticalCount,
            engineVersion: ENGINE_VERSION,
          }),
        },
        include: {
          insights: {
            include: {
              evidence: true,
            },
            orderBy: [
              { severity: "desc" },
              { createdAt: "desc" },
            ],
          },
        },
      });

    await publishDomainEvent({
      tenantId: input.tenantId,
      eventType: "GovernedExecutiveAI.InsightRunCompleted",
      aggregateType: "GovernedExecutiveInsightRun",
      aggregateId: run.id,
      sourceModule: "governed-executive-ai",
      actorUserId: input.actorUserId ?? undefined,
      payload: {
        runId: run.id,
        runNumber: run.runNumber,
        insightCount: candidates.length,
        criticalCount,
        engineVersion: ENGINE_VERSION,
      },
    });

    if (input.actorUserId) {
      await recordEnterpriseActivity({
        tenantId: input.tenantId,
        activityType: "GovernedExecutiveAI.InsightRunCompleted",
        sourceModule: "governed-executive-ai",
        title: "Governed executive insight run completed",
        description: run.runNumber,
        severity: criticalCount > 0 ? "WARNING" : "SUCCESS",
        actorUserId: input.actorUserId,
        subjectType: "GovernedExecutiveInsightRun",
        subjectId: run.id,
        subjectLabel: run.runNumber,
        actionUrl: "/app/executive/ai-intelligence",
      });
    }

    return completed;
  } catch (error) {
    await prisma.governedExecutiveInsightRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        failureCount: 1,
        summary: toJson({
          message:
            error instanceof Error
              ? error.message
              : "Unknown governed executive AI failure.",
        }),
      },
    });

    throw error;
  }
}

export async function acknowledgeGovernedExecutiveInsight(input: {
  tenantId: string;
  insightId: string;
  actorUserId: string;
}) {
  const insight =
    await prisma.governedExecutiveInsight.findFirstOrThrow({
      where: {
        id: input.insightId,
        tenantId: input.tenantId,
      },
    });

  return prisma.governedExecutiveInsight.update({
    where: { id: insight.id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedByUserId: input.actorUserId,
      acknowledgedAt: new Date(),
    },
  });
}

export async function dismissGovernedExecutiveInsight(input: {
  tenantId: string;
  insightId: string;
  actorUserId: string;
  reason: string;
}) {
  const insight =
    await prisma.governedExecutiveInsight.findFirstOrThrow({
      where: {
        id: input.insightId,
        tenantId: input.tenantId,
      },
    });

  return prisma.governedExecutiveInsight.update({
    where: { id: insight.id },
    data: {
      status: "DISMISSED",
      dismissedByUserId: input.actorUserId,
      dismissedAt: new Date(),
      dismissalReason: input.reason,
    },
  });
}

export async function recordGovernedExecutiveInsightFeedback(input: {
  tenantId: string;
  insightId: string;
  userId: string;
  feedbackType:
    | "USEFUL"
    | "NOT_USEFUL"
    | "INCORRECT"
    | "NEEDS_CONTEXT";
  comment?: string | null;
}) {
  const insight =
    await prisma.governedExecutiveInsight.findFirstOrThrow({
      where: {
        id: input.insightId,
        tenantId: input.tenantId,
      },
    });

  return prisma.governedExecutiveInsightFeedback.create({
    data: {
      tenantId: input.tenantId,
      insightId: insight.id,
      userId: input.userId,
      feedbackType: input.feedbackType,
      comment: input.comment ?? null,
    },
  });
}
