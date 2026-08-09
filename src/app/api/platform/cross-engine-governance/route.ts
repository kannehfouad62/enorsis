import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateCrossEngineGovernanceAssessment } from "@/core/ai-governance/cross-engine-governance";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const assessment =
    await generateCrossEngineGovernanceAssessment({
      tenantId: session.user.tenantId,
      userId: session.user.id,
    });

  return NextResponse.json(assessment);
}
