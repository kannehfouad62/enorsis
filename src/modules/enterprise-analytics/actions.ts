"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { dailyAnalyticsPeriod } from "@/core/enterprise-analytics/periods";
import { runEnterpriseAnalyticsAggregation } from "@/core/enterprise-analytics/aggregation";

export async function runEnterpriseAnalyticsAggregationAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await runEnterpriseAnalyticsAggregation({
    tenantId: user.tenantId,
    scope: "B2_INVENTORY_WAREHOUSE",
    period: dailyAnalyticsPeriod(),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/analytics-foundation");
}
