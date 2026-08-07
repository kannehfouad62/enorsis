import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { getEnterpriseKpiCards, getEnterpriseKpiExecutiveScore } from "@/core/enterprise-analytics/kpi-engine";
import { getExecutiveDecisionBriefing } from "@/core/governed-executive-ai/briefing";
import { ensureExecutiveBoardPackDefinitions } from "./definitions";

type PeriodType = "MONTHLY" | "QUARTERLY" | "ANNUAL" | "AD_HOC";

function fingerprint(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function boardReportingPeriod(
  periodType: PeriodType,
  date = new Date(),
) {
  if (periodType === "MONTHLY") {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    end.setMilliseconds(-1);
    return { periodStart: start, periodEnd: end };
  }

  if (periodType === "QUARTERLY") {
    const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
    const start = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth + 3, 1));
    end.setMilliseconds(-1);
    return { periodStart: start, periodEnd: end };
  }

  if (periodType === "ANNUAL") {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
    end.setMilliseconds(-1);
    return { periodStart: start, periodEnd: end };
  }

  const end = new Date(date);
  const start = new Date(end.getTime() - 30 * 86_400_000);
  return { periodStart: start, periodEnd: end };
}

export async function generateExecutiveBoardPack(input: {
  tenantId: string;
  definitionKey: string;
  actorUserId: string;
  periodType?: PeriodType | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) {
  await ensureExecutiveBoardPackDefinitions(input.tenantId);

  const definition =
    await prisma.executiveBoardPackDefinition.findUniqueOrThrow({
      where: {
        tenantId_definitionKey: {
          tenantId: input.tenantId,
          definitionKey: input.definitionKey,
        },
      },
    });

  const periodType =
    input.periodType ?? definition.defaultPeriodType;

  const derived = boardReportingPeriod(periodType);

  const periodStart = input.periodStart ?? derived.periodStart;
  const periodEnd = input.periodEnd ?? derived.periodEnd;

  const [
    cards,
    score,
    briefing,
    latestSynthesis,
    governanceApprovals,
  ] = await Promise.all([
    getEnterpriseKpiCards({ tenantId: input.tenantId }),
    getEnterpriseKpiExecutiveScore(input.tenantId),
    getExecutiveDecisionBriefing(input.tenantId),
    prisma.executiveSynthesis.findFirst({
      where: {
        tenantId: input.tenantId,
        createdAt: {
          lte: periodEnd,
        },
      },
      include: {
        synthesisRun: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.governedExecutiveInsightApproval.findMany({
      where: {
        tenantId: input.tenantId,
        createdAt: {
          lte: periodEnd,
        },
      },
      include: {
        insight: true,
        decisions: {
          orderBy: { decidedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const selectedCards =
    definition.packType === "CFO"
      ? cards.filter((card) =>
          ["Inventory", "Procurement"].includes(card.domain),
        )
      : definition.packType === "COO"
        ? cards.filter((card) =>
            ["Inventory", "Warehouse"].includes(card.domain),
          )
        : definition.packType === "CPO"
          ? cards.filter((card) => card.domain === "Procurement")
          : cards;

  const sourceSnapshot = {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    definitionKey: definition.definitionKey,
    packType: definition.packType,
    enterpriseScore: score,
    kpis: selectedCards.map((card) => ({
      metricKey: card.metricKey,
      name: card.name,
      domain: card.domain,
      currentValue: card.currentValue,
      previousValue: card.previousValue,
      targetValue: card.targetValue,
      healthStatus: card.healthStatus,
      trendDirection: card.trendDirection,
      calculatedAt: card.calculatedAt?.toISOString() ?? null,
    })),
    decisionBriefing: {
      summary: briefing.executiveSummary,
      decisionInsightIds: briefing.decisionQueue.map((item) => item.id),
      riskInsightIds: briefing.topRisks.map((item) => item.id),
      opportunityInsightIds: briefing.topOpportunities.map((item) => item.id),
    },
    synthesis: latestSynthesis
      ? {
          id: latestSynthesis.id,
          title: latestSynthesis.title,
          executiveSummary: latestSynthesis.executiveSummary,
          keyRisks: latestSynthesis.keyRisks,
          keyOpportunities: latestSynthesis.keyOpportunities,
          recommendedPriorities: latestSynthesis.recommendedPriorities,
          governanceNotes: latestSynthesis.governanceNotes,
          confidenceStatement: latestSynthesis.confidenceStatement,
          model: latestSynthesis.synthesisRun.model,
        }
      : null,
    governanceApprovals: governanceApprovals.map((approval) => ({
      id: approval.id,
      insightId: approval.insightId,
      status: approval.status,
      dueAt: approval.dueAt?.toISOString() ?? null,
      reviewerUserId: approval.assignedReviewerUserId,
      insightTitle: approval.insight.title,
      insightSeverity: approval.insight.severity,
      latestDecision: approval.decisions[0]
        ? {
            decision: approval.decisions[0].decision,
            decidedAt: approval.decisions[0].decidedAt.toISOString(),
            decidedByUserId: approval.decisions[0].decidedByUserId,
          }
        : null,
    })),
  };

  const sectionSnapshot = {
    executiveSummary:
      latestSynthesis?.executiveSummary ??
      `Enterprise health score is ${score.enterpriseHealthScore}/100 with ${score.criticalMetrics} critical and ${score.warningMetrics} warning KPIs.`,
    enterpriseHealth: score,
    risks: briefing.topRisks.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      domain: item.domain,
      summary: item.executiveSummary,
      recommendation: item.recommendation,
    })),
    opportunities: briefing.topOpportunities.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title,
      domain: item.domain,
      summary: item.executiveSummary,
      recommendation: item.recommendation,
    })),
    decisions: briefing.decisionQueue.slice(0, 15).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      priorityScore: item.priorityScore,
      recommendation: item.recommendation,
      requiresHumanReview: item.requiresHumanReview,
    })),
    synthesis: latestSynthesis
      ? {
          title: latestSynthesis.title,
          executiveSummary: latestSynthesis.executiveSummary,
          confidenceStatement: latestSynthesis.confidenceStatement,
        }
      : null,
  };

  const governanceSnapshot = {
    approvalCount: governanceApprovals.length,
    pending: governanceApprovals.filter((item) =>
      ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(item.status),
    ).length,
    approved: governanceApprovals.filter(
      (item) => item.status === "APPROVED",
    ).length,
    rejected: governanceApprovals.filter(
      (item) => item.status === "REJECTED",
    ).length,
    escalated: governanceApprovals.filter(
      (item) => item.status === "ESCALATED",
    ).length,
    records: sourceSnapshot.governanceApprovals,
  };

  const sourceFingerprint = fingerprint(sourceSnapshot);

  const count = await prisma.executiveBoardPack.count({
    where: { tenantId: input.tenantId },
  });

  const packNumber = `BRD-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(7, "0")}`;

  const pack = await prisma.executiveBoardPack.create({
    data: {
      tenantId: input.tenantId,
      definitionId: definition.id,
      packNumber,
      title: `${definition.name} — ${periodEnd.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })}`,
      packType: definition.packType,
      status: "GENERATED",
      periodType,
      periodStart,
      periodEnd,
      generatedAt: new Date(),
      generatedByUserId: input.actorUserId,
      executiveSummary: sectionSnapshot.executiveSummary,
      sourceSnapshot: toJson(sourceSnapshot),
      sectionSnapshot: toJson(sectionSnapshot),
      governanceSnapshot: toJson(governanceSnapshot),
      sourceFingerprint,
    },
  });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "ExecutiveBoardReporting.PackGenerated",
    aggregateType: "ExecutiveBoardPack",
    aggregateId: pack.id,
    sourceModule: "executive-board-reporting",
    actorUserId: input.actorUserId,
    payload: {
      packId: pack.id,
      packNumber: pack.packNumber,
      packType: pack.packType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ExecutiveBoardReporting.PackGenerated",
    sourceModule: "executive-board-reporting",
    title: "Executive board pack generated",
    description: pack.packNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ExecutiveBoardPack",
    subjectId: pack.id,
    subjectLabel: pack.title,
    actionUrl: "/app/executive/board-reporting",
  });

  return pack;
}

export async function finalizeExecutiveBoardPack(input: {
  tenantId: string;
  packId: string;
  actorUserId: string;
}) {
  const pack = await prisma.executiveBoardPack.findFirstOrThrow({
    where: {
      id: input.packId,
      tenantId: input.tenantId,
    },
  });

  return prisma.executiveBoardPack.update({
    where: { id: pack.id },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedByUserId: input.actorUserId,
    },
  });
}
