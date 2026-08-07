import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGovernedAnalyticsOverview } from "@/core/enterprise-analytics";

export async function GET() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const overview = await getGovernedAnalyticsOverview({
    tenantId: session.user.tenantId,
  });

  return NextResponse.json(overview);
}
