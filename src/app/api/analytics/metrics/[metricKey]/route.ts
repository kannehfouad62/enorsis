import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGovernedAnalyticsMetric } from "@/core/enterprise-analytics";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ metricKey: string }> },
) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { metricKey } = await context.params;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "30");

  const metric = await getGovernedAnalyticsMetric({
    tenantId: session.user.tenantId,
    metricKey,
    historyLimit: Number.isFinite(limit) ? limit : 30,
  });

  if (!metric) {
    return NextResponse.json(
      { error: "Metric not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(metric);
}
