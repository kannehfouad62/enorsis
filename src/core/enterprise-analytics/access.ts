import { prisma } from "@/lib/prisma";
import {
  getEnterpriseKpiCards,
  getEnterpriseKpiExecutiveScore,
  getEnterpriseKpiHistory,
} from "./kpi-engine";

export async function getGovernedAnalyticsOverview(input: {
  tenantId: string;
}) {
  const [cards, score, latestRun] = await Promise.all([
    getEnterpriseKpiCards({ tenantId: input.tenantId }),
    getEnterpriseKpiExecutiveScore(input.tenantId),
    prisma.enterpriseAnalyticsAggregationRun.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { createdAt: "desc" },
      include: { failures: true },
    }),
  ]);

  return {
    generatedAt: new Date(),
    score,
    metrics: cards,
    latestRun,
  };
}

export async function getGovernedAnalyticsMetric(input: {
  tenantId: string;
  metricKey: string;
  historyLimit?: number;
}) {
  const definition =
    await prisma.enterpriseAnalyticsMetricDefinition.findUnique({
      where: {
        tenantId_metricKey: {
          tenantId: input.tenantId,
          metricKey: input.metricKey,
        },
      },
    });

  if (!definition || !definition.active) return null;

  const history = await getEnterpriseKpiHistory({
    tenantId: input.tenantId,
    metricKey: input.metricKey,
    limit: Math.min(Math.max(input.historyLimit ?? 30, 1), 365),
  });

  return {
    definition,
    history,
  };
}

export async function getGovernedAnalyticsRuns(input: {
  tenantId: string;
  limit?: number;
}) {
  return prisma.enterpriseAnalyticsAggregationRun.findMany({
    where: { tenantId: input.tenantId },
    include: { failures: true },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 25, 1), 100),
  });
}
