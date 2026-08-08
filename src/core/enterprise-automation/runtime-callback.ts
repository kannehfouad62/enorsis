import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { buildAutomationCallbackKey } from "./runtime-idempotency";
import { resumeDurableAutomationExecution } from "./durable-runtime";

export async function processAutomationRuntimeCallback(input: {
  tenantId: string;
  actionId: string;
  externalCallbackId?: string | null;
  source?: string | null;
  outcome: "ACKNOWLEDGED" | "COMPLETED" | "FAILED";
  externalReference?: string | null;
  payload?: Record<string, unknown>;
}) {
  const action =
    await prisma.enterpriseAutomationRuntimeAction.findFirstOrThrow({
      where: {
        id: input.actionId,
        tenantId: input.tenantId,
      },
      include: {
        runtimeNode: true,
      },
    });

  const callbackKey = buildAutomationCallbackKey({
    actionId: action.id,
    externalCallbackId: input.externalCallbackId,
    payload: input.payload ?? {},
  });

  const duplicate =
    await prisma.enterpriseAutomationRuntimeCallback.findFirst({
      where: {
        tenantId: input.tenantId,
        callbackKey,
      },
    });

  if (duplicate) {
    return {
      duplicate: true,
      callback: duplicate,
      action,
    };
  }

  const callback =
    await prisma.enterpriseAutomationRuntimeCallback.create({
      data: {
        tenantId: input.tenantId,
        actionId: action.id,
        callbackKey,
        status: "ACCEPTED",
        payload: toJson(input.payload ?? {}),
        source: input.source ?? null,
        processedAt: new Date(),
      },
    });

  if (input.outcome === "ACKNOWLEDGED") {
    const updated =
      await prisma.enterpriseAutomationRuntimeAction.update({
        where: { id: action.id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          externalReference:
            input.externalReference ?? action.externalReference,
          responsePayload: toJson(input.payload ?? {}),
        },
      });

    return {
      duplicate: false,
      callback,
      action: updated,
    };
  }

  if (input.outcome === "FAILED") {
    const message = String(
      input.payload?.message ??
        "External action callback reported failure.",
    );

    await prisma.$transaction([
      prisma.enterpriseAutomationRuntimeAction.update({
        where: { id: action.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          lastError: message,
          responsePayload: toJson(input.payload ?? {}),
          externalReference:
            input.externalReference ?? action.externalReference,
        },
      }),
      prisma.enterpriseAutomationRuntimeNode.update({
        where: { id: action.runtimeNodeId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          lastError: message,
          failureCode: "EXTERNAL_ACTION_FAILED",
        },
      }),
      prisma.enterpriseAutomationRuntimeExecution.update({
        where: { id: action.executionId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          wakeAt: null,
          lastError: message,
        },
      }),
    ]);

    return {
      duplicate: false,
      callback,
      action:
        await prisma.enterpriseAutomationRuntimeAction.findUniqueOrThrow({
          where: { id: action.id },
        }),
    };
  }

  await prisma.$transaction([
    prisma.enterpriseAutomationRuntimeAction.update({
      where: { id: action.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        acknowledgedAt: action.acknowledgedAt ?? new Date(),
        externalReference:
          input.externalReference ?? action.externalReference,
        responsePayload: toJson(input.payload ?? {}),
      },
    }),
    prisma.enterpriseAutomationRuntimeNode.update({
      where: { id: action.runtimeNodeId },
      data: {
        status: "READY",
        waitReason: "ACTION_COMPLETED",
        lastError: null,
      },
    }),
    prisma.enterpriseAutomationRuntimeExecution.update({
      where: { id: action.executionId },
      data: {
        status: "RUNNING",
        completedAt: null,
        wakeAt: null,
        lastError: null,
      },
    }),
  ]);

  await resumeDurableAutomationExecution({
    tenantId: input.tenantId,
    executionId: action.executionId,
  });

  return {
    duplicate: false,
    callback,
    action:
      await prisma.enterpriseAutomationRuntimeAction.findUniqueOrThrow({
        where: { id: action.id },
      }),
  };
}
