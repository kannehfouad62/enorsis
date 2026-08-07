import { prisma } from "@/lib/prisma";
import { dailyAnalyticsPeriod } from "./periods";
import { runEnterpriseAnalyticsAggregation } from "./aggregation";

export async function runScheduledEnterpriseAnalyticsRefresh() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });

  const results: Array<{
    tenantId: string;
    status: "COMPLETED" | "COMPLETED_WITH_WARNINGS" | "FAILED";
    runId?: string;
    message?: string;
  }> = [];

  for (const tenant of tenants) {
    try {
      const run = await runEnterpriseAnalyticsAggregation({
        tenantId: tenant.id,
        scope: "SCHEDULED_DAILY_ENTERPRISE_ANALYTICS",
        period: dailyAnalyticsPeriod(),
      });

      results.push({
        tenantId: tenant.id,
        status:
          run.status === "FAILED"
            ? "FAILED"
            : run.status === "COMPLETED_WITH_WARNINGS"
              ? "COMPLETED_WITH_WARNINGS"
              : "COMPLETED",
        runId: run.id,
      });
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown scheduled analytics error.",
      });
    }
  }

  return {
    tenantCount: tenants.length,
    completed: results.filter((item) => item.status === "COMPLETED").length,
    warnings: results.filter(
      (item) => item.status === "COMPLETED_WITH_WARNINGS",
    ).length,
    failed: results.filter((item) => item.status === "FAILED").length,
    results,
  };
}
