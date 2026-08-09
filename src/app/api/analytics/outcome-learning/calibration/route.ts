import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPredictionCalibrationAnalytics } from "@/core/closed-loop-procurement/calibration";

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
    await getPredictionCalibrationAnalytics(
      session.user.tenantId,
    );

  return NextResponse.json(data);
}
