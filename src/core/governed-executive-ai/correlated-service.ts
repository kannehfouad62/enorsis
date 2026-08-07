import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { evaluateCrossDomainCorrelations } from "./correlations";
import {
  executiveInsightRationale,
  rankExecutiveInsightCandidates,
} from "./explainability";

const ENGINE_VERSION = "B2.8.5.2-cross-domain";

export async function runCrossDomainExecutiveInsightEngine(input: {
  tenantId: string;
  actorUserId?: string | null;
}) {
  const count = await prisma.governedExecutiveInsightRun.count({
    where: { tenantId: input.tenantId },
  });

  const run = await prisma.governedExecutiveInsightRun.create({
    data: {
      tenantId: input.tenantId,
      runNumber: `AI-CORR-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(7, "0")}`,
      status: "RUNNING",
      engineVersion: ENGINE_VERSION,
      scope: "CROSS_DOMAIN_EXECUTIVE_CORRELATION",
      startedAt: new Date(),
      initiatedByUserId: input.actorUserId ?? null,
    },
  });

  try {
    const candidates = rankExecutiveInsightCandidates(
      await evaluateCrossDomainCorrelations({
        tenantId: input.tenantId,
      }),
    );

    for (const candidate of candidates) {
      const rationale = executiveInsightRationale(candidate);

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
              evidence: toJson({
                ...(item.evidence ?? {}),
                rationale,
              }),
            })),
          },
        },
      });
    }

    const critical = candidates.filter(
      (candidate) => candidate.severity === "CRITICAL",
    ).length;
    const humanReview = candidates.filter(
      (candidate) => candidate.requiresHumanReview,
    ).length;

    const completed =
      await prisma.governedExecutiveInsightRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          insightCount: candidates.length,
          warningCount: critical + humanReview,
          summary: toJson({
            engineVersion: ENGINE_VERSION,
            insightCount: candidates.length,
            criticalInsights: critical,
            humanReviewRequired: humanReview,
            domains: Array.from(
              new Set(candidates.map((candidate) => candidate.category)),
            ),
          }),
        },
        include: {
          insights: {
            include: { evidence: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

    await publishDomainEvent({
      tenantId: input.tenantId,
      eventType: "GovernedExecutiveAI.CrossDomainRunCompleted",
      aggregateType: "GovernedExecutiveInsightRun",
      aggregateId: run.id,
      sourceModule: "governed-executive-ai",
      actorUserId: input.actorUserId ?? undefined,
      payload: {
        runId: run.id,
        runNumber: run.runNumber,
        insightCount: candidates.length,
        criticalInsights: critical,
        humanReviewRequired: humanReview,
      },
    });

    if (input.actorUserId) {
      await recordEnterpriseActivity({
        tenantId: input.tenantId,
        activityType: "GovernedExecutiveAI.CrossDomainRunCompleted",
        sourceModule: "governed-executive-ai",
        title: "Cross-domain executive intelligence completed",
        description: run.runNumber,
        severity: critical > 0 ? "WARNING" : "SUCCESS",
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
          engineVersion: ENGINE_VERSION,
          message:
            error instanceof Error
              ? error.message
              : "Unknown cross-domain insight failure.",
        }),
      },
    });

    throw error;
  }
}
