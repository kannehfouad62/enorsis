import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runAiRuntimeCertification } from "@/core/ai-certification/runtime-certification";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const run =
    await runAiRuntimeCertification({
      tenantId: session.user.tenantId,
      userId: session.user.id,
    });

  return NextResponse.json(run);
}
