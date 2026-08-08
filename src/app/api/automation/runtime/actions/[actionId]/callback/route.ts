import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { processAutomationRuntimeCallback } from "@/core/enterprise-automation/runtime-callback";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ actionId: string }>;
  },
) {
  const session = await auth();
  const { actionId } = await context.params;

  const body = (await request.json()) as {
    outcome?: "ACKNOWLEDGED" | "COMPLETED" | "FAILED";
    externalCallbackId?: string;
    externalReference?: string;
    source?: string;
    payload?: Record<string, unknown>;
  };

  const action =
    await prisma.enterpriseAutomationRuntimeAction.findUnique({
      where: { id: actionId },
      select: {
        id: true,
        tenantId: true,
      },
    });

  if (!action) {
    return NextResponse.json(
      { error: "Runtime action not found." },
      { status: 404 },
    );
  }

  const internalUser =
    session?.user?.tenantId === action.tenantId;

  const callbackToken =
    request.headers.get("x-enorsis-callback-token");
  const configuredToken =
    process.env.ENORSIS_AUTOMATION_CALLBACK_TOKEN;

  const externalAuthorized =
    Boolean(configuredToken) &&
    callbackToken === configuredToken;

  if (!internalUser && !externalAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized callback." },
      { status: 401 },
    );
  }

  if (!body.outcome) {
    return NextResponse.json(
      { error: "Callback outcome is required." },
      { status: 400 },
    );
  }

  const result =
    await processAutomationRuntimeCallback({
      tenantId: action.tenantId,
      actionId: action.id,
      outcome: body.outcome,
      externalCallbackId:
        body.externalCallbackId ?? null,
      externalReference:
        body.externalReference ?? null,
      source: body.source ?? null,
      payload: body.payload ?? {},
    });

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    actionId: result.action.id,
    status: result.action.status,
  });
}
