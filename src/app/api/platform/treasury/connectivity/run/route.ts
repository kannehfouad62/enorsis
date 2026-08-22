import { NextResponse } from "next/server";

import {
  runTreasuryConnectivityAutomation,
} from "@/modules/treasury-connectivity/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result =
    await runTreasuryConnectivityAutomation();

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
