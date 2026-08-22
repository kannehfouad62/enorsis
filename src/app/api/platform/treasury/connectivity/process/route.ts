import { NextResponse } from "next/server";

import {
  processTreasuryConnectivityEvents,
} from "@/modules/treasury-connectivity/processor";

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

  const results =
    await processTreasuryConnectivityEvents({
      limit: 100,
    });

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
