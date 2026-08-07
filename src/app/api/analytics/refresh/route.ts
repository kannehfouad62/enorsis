import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dailyAnalyticsPeriod } from "@/core/enterprise-analytics/periods";
import { runEnterpriseAnalyticsAggregation } from "@/core/enterprise-analytics/aggregation";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
]);

export async function POST() {
  const session = await auth();

  if (!session?.user?.tenantId || !session.user.roles?.length) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const hasAllowedRole = session.user.roles.some((role) =>
    allowedRoles.has(role),
  );

  if (!hasAllowedRole) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const run = await runEnterpriseAnalyticsAggregation({
    tenantId: session.user.tenantId,
    scope: "API_MANUAL_REFRESH",
    period: dailyAnalyticsPeriod(),
    actorUserId: session.user.id,
  });

  return NextResponse.json(run);
}