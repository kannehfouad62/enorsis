import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateClosedLoopLearningProposals } from "@/core/closed-loop-procurement/learning-proposals";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result =
    await generateClosedLoopLearningProposals(
      session.user.tenantId,
    );

  return NextResponse.json(result);
}
