import { NextResponse } from "next/server";

import {
  processQueuedIntegrationSyncs,
} from "@/core/integrations";
import {
  processIntegrationQueue,
} from "@/core/integrations/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const [
    outboundJobs,
    enterpriseSyncs,
  ] = await Promise.all([
    processIntegrationQueue(10),
    processQueuedIntegrationSyncs({
      limit: 10,
    }),
  ]);

  return NextResponse.json({
    processedAt:
      new Date().toISOString(),
    outboundJobs,
    enterpriseSyncs,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
