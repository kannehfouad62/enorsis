import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveRuntimeLearningPolicySnapshot } from "@/core/closed-loop-procurement/runtime-policy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const confidenceRaw = Number(
    url.searchParams.get("confidence") ?? "75",
  );
  const thresholdRaw = Number(
    url.searchParams.get("defaultThreshold") ??
      "70",
  );

  const confidence = Number.isFinite(
    confidenceRaw,
  )
    ? confidenceRaw
    : 75;

  const defaultConfidenceThreshold =
    Number.isFinite(thresholdRaw)
      ? thresholdRaw
      : 70;

  const snapshot =
    await resolveRuntimeLearningPolicySnapshot({
      tenantId: session.user.tenantId,
      confidence,
      defaultConfidenceThreshold,
    });

  return NextResponse.json(snapshot);
}
