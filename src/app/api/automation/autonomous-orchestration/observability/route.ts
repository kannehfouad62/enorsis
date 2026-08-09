import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAutonomousOrchestrationObservability } from "@/core/autonomous-procurement/orchestration-observability";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const data =
    await getAutonomousOrchestrationObservability(
      session.user.tenantId,
    );

  return NextResponse.json({
    metrics: data.metrics,
    stageDistribution: data.stageDistribution,
    workflowDistribution:
      data.workflowDistribution,
    eventDistribution:
      data.eventDistribution,
  });
}
