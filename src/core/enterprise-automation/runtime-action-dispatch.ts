import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import type { AutomationCanvasNode } from "./graph-types";
import { buildAutomationActionIdempotencyKey } from "./runtime-idempotency";

export async function dispatchDurableAutomationAction(input: {
  tenantId: string;
  executionId: string;
  runtimeNodeId: string;
  node: AutomationCanvasNode;
  executionInput: unknown;
}) {
  const actionType = String(
    input.node.configuration.actionType ?? "UNKNOWN",
  );

  const idempotencyKey = buildAutomationActionIdempotencyKey({
    tenantId: input.tenantId,
    executionId: input.executionId,
    runtimeNodeId: input.runtimeNodeId,
    nodeId: input.node.id,
    actionType,
  });

  const existing =
    await prisma.enterpriseAutomationRuntimeAction.findFirst({
      where: {
        tenantId: input.tenantId,
        idempotencyKey,
      },
    });

  if (
    existing &&
    ["DISPATCHED", "ACKNOWLEDGED", "COMPLETED"].includes(
      existing.status,
    )
  ) {
    return {
      action: existing,
      duplicateSuppressed: true,
    };
  }

  const action = existing
    ? await prisma.enterpriseAutomationRuntimeAction.update({
        where: { id: existing.id },
        data: {
          status: "DISPATCHED",
          dispatchCount: { increment: 1 },
          lastDispatchedAt: new Date(),
          lastError: null,
        },
      })
    : await prisma.enterpriseAutomationRuntimeAction.create({
        data: {
          tenantId: input.tenantId,
          executionId: input.executionId,
          runtimeNodeId: input.runtimeNodeId,
          nodeId: input.node.id,
          actionType,
          idempotencyKey,
          status: "DISPATCHED",
          dispatchCount: 1,
          lastDispatchedAt: new Date(),
          requestPayload: toJson({
            actionType,
            configuration: input.node.configuration,
            input: input.executionInput,
          }),
        },
      });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "EnterpriseAutomation.RuntimeActionDispatched",
    aggregateType: "EnterpriseAutomationRuntimeAction",
    aggregateId: action.id,
    sourceModule: "enterprise-automation",
    payload: {
      actionId: action.id,
      executionId: input.executionId,
      runtimeNodeId: input.runtimeNodeId,
      nodeId: input.node.id,
      actionType,
      idempotencyKey,
      configuration: input.node.configuration,
      input: input.executionInput,
    },
  });

  return {
    action,
    duplicateSuppressed: false,
  };
}
