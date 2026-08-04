import { NextResponse } from "next/server";
import { processIntegrationQueue } from "@/core/integrations/delivery";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const result = await processIntegrationQueue(limit);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
