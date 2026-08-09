import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  calculateAiRuntimeHealth,
  captureAiRuntimeHealthSnapshot,
} from "@/core/ai-monitoring/runtime-health";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const health =
    await calculateAiRuntimeHealth(
      session.user.tenantId,
    );

  return NextResponse.json(health);
}

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const snapshot =
    await captureAiRuntimeHealthSnapshot(
      session.user.tenantId,
    );

  return NextResponse.json(snapshot);
}
