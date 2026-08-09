import { NextResponse } from "next/server";
import { reconcileClosedLoopOutcomes } from "@/core/closed-loop-procurement/native-reconciliation";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  return Boolean(
    secret &&
      request.headers.get("authorization") ===
        `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  const result =
    await reconcileClosedLoopOutcomes();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
