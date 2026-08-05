import { NextResponse } from "next/server";
import { processQueuedIntegrationSyncs } from "@/core/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const results = await processQueuedIntegrationSyncs({
    limit: 20,
  });

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
