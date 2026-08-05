import { NextResponse } from "next/server";
import { processPendingEventDeliveries } from "@/core/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await processPendingEventDeliveries({
    workerId:
      request.headers.get("x-enorsis-worker-id") ??
      `event-worker:${process.pid}`,
    limit: 50,
  });

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: Request) {
  return POST(request);
}
