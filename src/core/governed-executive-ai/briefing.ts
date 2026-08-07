import { prisma } from "@/lib/prisma";

const severityWeight = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 45,
  LOW: 20,
} as const;

function priorityScore(input: {
  severity: keyof typeof severityWeight;
  confidenceScore: number;
  requiresHumanReview: boolean;
  evidenceCount: number;
  type: string;
}) {
  const typeWeight =
    input.type === "RISK"
      ? 15
      : input.type === "GOVERNANCE"
        ? 12
        : input.type === "ANOMALY"
          ? 10
          : input.type === "OPPORTUNITY"
            ? 6
            : 4;

  return Math.round(
    severityWeight[input.severity] +
      input.confidenceScore * 0.2 +
      (input.requiresHumanReview ? 15 : 0) +
      Math.min(input.evidenceCount * 2, 10) +
      typeWeight,
  );
}

export async function getExecutiveDecisionBriefing(tenantId: string) {
  const insights = await prisma.governedExecutiveInsight.findMany({
    where: {
      tenantId,
      status: {
        in: ["PUBLISHED", "ACKNOWLEDGED"],
      },
    },
    include: {
      evidence: true,
      insightRun: true,
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const ranked = insights
    .map((insight) => ({
      ...insight,
      priorityScore: priorityScore({
        severity: insight.severity,
        confidenceScore: Number(insight.confidenceScore),
        requiresHumanReview: insight.requiresHumanReview,
        evidenceCount: insight.evidence.length,
        type: insight.type,
      }),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const decisionQueue = ranked.filter(
    (insight) =>
      insight.requiresHumanReview ||
      ["CRITICAL", "HIGH"].includes(insight.severity),
  );

  const opportunities = ranked.filter(
    (insight) => insight.type === "OPPORTUNITY",
  );

  const risks = ranked.filter(
    (insight) =>
      insight.type === "RISK" ||
      insight.type === "GOVERNANCE" ||
      insight.type === "ANOMALY",
  );

  const domainCounts = new Map<string, number>();
  for (const insight of ranked) {
    domainCounts.set(
      insight.domain,
      (domainCounts.get(insight.domain) ?? 0) + 1,
    );
  }

  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const executiveSummary = {
    totalInsights: ranked.length,
    decisionItems: decisionQueue.length,
    criticalInsights: ranked.filter(
      (insight) => insight.severity === "CRITICAL",
    ).length,
    highInsights: ranked.filter(
      (insight) => insight.severity === "HIGH",
    ).length,
    opportunities: opportunities.length,
    humanReviewRequired: ranked.filter(
      (insight) => insight.requiresHumanReview,
    ).length,
    acknowledged: ranked.filter(
      (insight) => insight.status === "ACKNOWLEDGED",
    ).length,
  };

  return {
    generatedAt: new Date(),
    executiveSummary,
    decisionQueue: decisionQueue.slice(0, 25),
    topRisks: risks.slice(0, 12),
    topOpportunities: opportunities.slice(0, 12),
    topDomains,
    recentInsights: ranked.slice(0, 30),
  };
}
