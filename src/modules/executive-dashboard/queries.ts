import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getEnterpriseKpiCards,
  getEnterpriseKpiExecutiveScore,
} from "@/core/enterprise-analytics/kpi-engine";

export async function getExecutiveDashboardWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [cards, score, recentRuns, criticalMetrics] = await Promise.all([
    getEnterpriseKpiCards({ tenantId }),
    getEnterpriseKpiExecutiveScore(tenantId),
    prisma.enterpriseAnalyticsAggregationRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.enterpriseAnalyticsMetricSnapshot.findMany({
      where: {
        tenantId,
        healthStatus: {
          in: ["CRITICAL", "WARNING"],
        },
        dimensionKey: "ALL",
      },
      include: {
        metricDefinition: true,
      },
      orderBy: { calculatedAt: "desc" },
      take: 12,
    }),
  ]);

  const latestByMetric = new Map<string, (typeof criticalMetrics)[number]>();

  for (const item of criticalMetrics) {
    if (!latestByMetric.has(item.metricDefinitionId)) {
      latestByMetric.set(item.metricDefinitionId, item);
    }
  }

  const inventoryCards = cards.filter((card) => card.domain === "Inventory");
  const warehouseCards = cards.filter((card) => card.domain === "Warehouse");

  return {
    cards,
    score,
    inventoryCards,
    warehouseCards,
    recentRuns,
    criticalMetrics: Array.from(latestByMetric.values()),
  };
}
