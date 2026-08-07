import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGovernedAnalyticsRuns } from "@/core/enterprise-analytics";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "25");

  const runs = await getGovernedAnalyticsRuns({
    tenantId: session.user.tenantId,
    limit: Number.isFinite(limit) ? limit : 25,
  });

  return NextResponse.json({
    generatedAt: new Date(),
    runs,
  });
}
