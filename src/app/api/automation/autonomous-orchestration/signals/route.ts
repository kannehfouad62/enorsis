import { NextResponse } from "next/server";
import { receiveAutonomousOrchestrationSignal } from "@/core/autonomous-procurement/orchestration-signals";

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

export async function POST(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  const body = (await request.json()) as {
    tenantId?: string;
    runId?: string;
    executionHandoffId?: string;
    signalType?: string;
    idempotencyKey?: string;
    actorUserId?: string;
    source?: string;
    payload?: unknown;
  };

  if (
    !body.tenantId ||
    !body.signalType ||
    !body.idempotencyKey
  ) {
    return NextResponse.json(
      {
        error:
          "tenantId, signalType and idempotencyKey are required.",
      },
      { status: 400 },
    );
  }

  try {
    const signal =
      await receiveAutonomousOrchestrationSignal({
        tenantId: body.tenantId,
        runId: body.runId ?? null,
        executionHandoffId:
          body.executionHandoffId ?? null,
        signalType: body.signalType,
        idempotencyKey: body.idempotencyKey,
        actorUserId: body.actorUserId ?? null,
        source: body.source ?? "INTERNAL",
        payload: body.payload,
      });

    return NextResponse.json({
      id: signal.id,
      status: signal.status,
      processingResult:
        signal.processingResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Signal processing failed.",
      },
      { status: 400 },
    );
  }
}
