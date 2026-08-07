import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { dailyAnalyticsPeriod } from "./periods";
import { runEnterpriseAnalyticsAggregation } from "./aggregation";

export type EnterpriseKpiCard = {
  id: string;
  metricKey: string;
  name: string;
  description: string | null;
  domain: string;
  category: string | null;
  metricType: string;
  unit: string | null;
  currencyCode: string | null;
  currentValue: number | null;
  previousValue: number | null;
  targetValue: number | null;
  varianceValue: number | null;
  variancePercent: number | null;
  trendDirection: string;
  healthStatus: string;
  higherIsBetter: boolean;
  sourceRecordCount: number;
  calculatedAt: Date | null;
  drilldownPath: string | null;
};

export type EnterpriseKpiDomainSummary = {
  domain: string;
  metricCount: number;
  healthyCount: number;
  watchCount: number;
  warningCount: number;
  criticalCount: number;
  unavailableCount: number;
  healthScore: number;
};

function numeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getEnterpriseKpiCards(input: {
  tenantId: string;
  domain?: string | null;
}) {
  const definitions =
    await prisma.enterpriseAnalyticsMetricDefinition.findMany({
      where: {
        tenantId: input.tenantId,
        active: true,
        ...(input.domain ? { domain: input.domain } : {}),
      },
      orderBy: [{ domain: "asc" }, { category: "asc" }, { name: "asc" }],
    });

  const cards: EnterpriseKpiCard[] = [];

  for (const definition of definitions) {
    const latest = await prisma.enterpriseAnalyticsMetricSnapshot.findFirst({
      where: {
        tenantId: input.tenantId,
        metricDefinitionId: definition.id,
        dimensionKey: "ALL",
      },
      orderBy: [{ periodStart: "desc" }, { calculatedAt: "desc" }],
    });

    cards.push({
      id: definition.id,
      metricKey: definition.metricKey,
      name: definition.name,
      description: definition.description,
      domain: definition.domain,
      category: definition.category,
      metricType: definition.metricType,
      unit: definition.unit,
      currencyCode: definition.currencyCode,
      currentValue: numeric(latest?.numericValue),
      previousValue: numeric(latest?.previousValue),
      targetValue:
        numeric(latest?.targetValue) ?? numeric(definition.targetValue),
      varianceValue: numeric(latest?.varianceValue),
      variancePercent: numeric(latest?.variancePercent),
      trendDirection: latest?.trendDirection ?? "NOT_AVAILABLE",
      healthStatus: latest?.healthStatus ?? "NOT_AVAILABLE",
      higherIsBetter: definition.higherIsBetter,
      sourceRecordCount: latest?.sourceRecordCount ?? 0,
      calculatedAt: latest?.calculatedAt ?? null,
      drilldownPath: definition.drilldownPath,
    });
  }

  return cards;
}

export function summarizeEnterpriseKpis(
  cards: EnterpriseKpiCard[],
): EnterpriseKpiDomainSummary[] {
  const grouped = new Map<string, EnterpriseKpiCard[]>();

  for (const card of cards) {
    const current = grouped.get(card.domain) ?? [];
    current.push(card);
    grouped.set(card.domain, current);
  }

  return Array.from(grouped.entries())
    .map(([domain, domainCards]) => {
      const healthyCount = domainCards.filter(
        (card) => card.healthStatus === "GOOD",
      ).length;
      const watchCount = domainCards.filter(
        (card) => card.healthStatus === "WATCH",
      ).length;
      const warningCount = domainCards.filter(
        (card) => card.healthStatus === "WARNING",
      ).length;
      const criticalCount = domainCards.filter(
        (card) => card.healthStatus === "CRITICAL",
      ).length;
      const unavailableCount = domainCards.filter(
        (card) => card.healthStatus === "NOT_AVAILABLE",
      ).length;

      const ratedCount = Math.max(
        domainCards.length - unavailableCount,
        0,
      );

      const weighted =
        healthyCount * 100 +
        watchCount * 75 +
        warningCount * 45 +
        criticalCount * 10;

      const healthScore =
        ratedCount > 0 ? Math.round(weighted / ratedCount) : 0;

      return {
        domain,
        metricCount: domainCards.length,
        healthyCount,
        watchCount,
        warningCount,
        criticalCount,
        unavailableCount,
        healthScore,
      };
    })
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function getEnterpriseKpiHistory(input: {
  tenantId: string;
  metricKey: string;
  limit?: number;
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

  if (!definition) return [];

  return prisma.enterpriseAnalyticsMetricSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      metricDefinitionId: definition.id,
      dimensionKey: "ALL",
    },
    orderBy: { periodStart: "desc" },
    take: input.limit ?? 30,
  });
}

export async function updateEnterpriseKpiGovernance(input: {
  tenantId: string;
  metricDefinitionId: string;
  targetValue?: number | null;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  higherIsBetter: boolean;
  calculationVersion?: string | null;
}) {
  const definition =
    await prisma.enterpriseAnalyticsMetricDefinition.findFirstOrThrow({
      where: {
        id: input.metricDefinitionId,
        tenantId: input.tenantId,
      },
    });

  return prisma.enterpriseAnalyticsMetricDefinition.update({
    where: { id: definition.id },
    data: {
      targetValue: input.targetValue ?? null,
      warningThreshold: input.warningThreshold ?? null,
      criticalThreshold: input.criticalThreshold ?? null,
      higherIsBetter: input.higherIsBetter,
      calculationVersion:
        input.calculationVersion?.trim() ||
        definition.calculationVersion,
      metadata: toJson({
        governanceUpdatedAt: new Date().toISOString(),
      }),
    },
  });
}

export async function refreshEnterpriseKpis(input: {
  tenantId: string;
  actorUserId: string;
}) {
  return runEnterpriseAnalyticsAggregation({
    tenantId: input.tenantId,
    scope: "ENTERPRISE_KPI_ENGINE",
    period: dailyAnalyticsPeriod(),
    actorUserId: input.actorUserId,
  });
}

export async function getEnterpriseKpiExecutiveScore(
  tenantId: string,
) {
  const cards = await getEnterpriseKpiCards({ tenantId });
  const domains = summarizeEnterpriseKpis(cards);

  const rated = domains.filter((domain) => domain.metricCount > 0);

  const enterpriseHealthScore =
    rated.length > 0
      ? Math.round(
          rated.reduce(
            (sum, domain) => sum + domain.healthScore,
            0,
          ) / rated.length,
        )
      : 0;

  return {
    enterpriseHealthScore,
    domains,
    totalMetrics: cards.length,
    criticalMetrics: cards.filter(
      (card) => card.healthStatus === "CRITICAL",
    ).length,
    warningMetrics: cards.filter(
      (card) => card.healthStatus === "WARNING",
    ).length,
    unavailableMetrics: cards.filter(
      (card) => card.healthStatus === "NOT_AVAILABLE",
    ).length,
  };
}
