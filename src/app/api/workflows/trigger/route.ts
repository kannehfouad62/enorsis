import { NextResponse } from "next/server";
import { triggerWorkflowEvent } from "@/modules/workflows/automation";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "A JSON request body is required." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const required = [
    "tenantId",
    "event",
    "resourceType",
    "resourceId",
    "startedByUserId",
  ] as const;

  const missing = required.filter(
    (key) => typeof input[key] !== "string" || !String(input[key]).trim(),
  );

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const context =
    input.context &&
    typeof input.context === "object" &&
    !Array.isArray(input.context)
      ? (input.context as Record<string, unknown>)
      : {};

  const result = await triggerWorkflowEvent({
    tenantId: String(input.tenantId),
    event: String(input.event),
    resourceType: String(input.resourceType),
    resourceId: String(input.resourceId),
    startedByUserId: String(input.startedByUserId),
    context,
  });

  return NextResponse.json(result, { status: 202 });
}
