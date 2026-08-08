import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import {
  processAutomationRuntimeCallback,
} from "../runtime-callback";
import {
  resolveAutomationConnectorAdapter,
} from "./registry";

type StoredActionRequest = {
  actionType?: unknown;
  configuration?: unknown;
  input?: unknown;
};

export async function executePendingAutomationAction(
  actionId: string,
) {
  const action =
    await prisma.enterpriseAutomationRuntimeAction.findUniqueOrThrow({
      where: { id: actionId },
    });

  if (
    action.status === "COMPLETED" ||
    action.status === "CANCELLED"
  ) {
    return action;
  }

  const request =
    action.requestPayload as StoredActionRequest;

  const configuration =
    request.configuration &&
    typeof request.configuration === "object" &&
    !Array.isArray(request.configuration)
      ? (request.configuration as Record<
          string,
          unknown
        >)
      : {};

  const adapter =
    resolveAutomationConnectorAdapter(
      action.actionType,
    );

  try {
    const result = await adapter.execute({
      tenantId: action.tenantId,
      actionId: action.id,
      idempotencyKey: action.idempotencyKey,
      actionType: action.actionType,
      configuration,
      input: request.input,
    });

    if (result.mode === "ASYNC") {
      return prisma.enterpriseAutomationRuntimeAction.update({
        where: { id: action.id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          externalReference:
            result.externalReference ?? null,
          responsePayload: toJson(
            result.payload ?? {},
          ),
        },
      });
    }

    return (
      await processAutomationRuntimeCallback({
        tenantId: action.tenantId,
        actionId: action.id,
        outcome:
          result.mode === "ACKNOWLEDGED"
            ? "ACKNOWLEDGED"
            : "COMPLETED",
        externalReference:
          result.externalReference ?? null,
        source: "ENORSIS_CONNECTOR_EXECUTOR",
        payload: result.payload ?? {},
        externalCallbackId:
          `executor:${action.id}:${action.dispatchCount}`,
      })
    ).action;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown connector execution failure.";

    await prisma.enterpriseAutomationRuntimeAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        lastError: message,
      },
    });

    throw error;
  }
}

export async function runPendingAutomationActions() {
  const actions =
    await prisma.enterpriseAutomationRuntimeAction.findMany({
      where: {
        status: "DISPATCHED",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    });

  const results = [];

  for (const action of actions) {
    try {
      const result =
        await executePendingAutomationAction(
          action.id,
        );

      results.push({
        actionId: action.id,
        status: result.status,
      });
    } catch (error) {
      results.push({
        actionId: action.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown connector failure.",
      });
    }
  }

  return {
    processed: actions.length,
    results,
  };
}
