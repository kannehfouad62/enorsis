import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateWorkflowCondition } from "./conditions";
import { startWorkflow } from "./engine";

export interface WorkflowTriggerRequest {
  tenantId: string;
  event: string;
  resourceType: string;
  resourceId: string;
  startedByUserId: string;
  context: Record<string, unknown>;
}

export async function triggerWorkflowEvent({
  tenantId,
  event,
  resourceType,
  resourceId,
  startedByUserId,
  context,
}: WorkflowTriggerRequest) {
  const definitions = await prisma.workflowDefinition.findMany({
    where: {
      tenantId,
      resourceType,
      triggerEvent: event,
      status: "ACTIVE",
    },
    orderBy: { version: "desc" },
  });

  const launched: string[] = [];
  const skipped: Array<{ definitionId: string; reason: string }> = [];

  for (const definition of definitions) {
    const existing = await prisma.workflowInstance.findFirst({
      where: {
        tenantId,
        workflowDefinitionId: definition.id,
        resourceType,
        resourceId,
        status: {
          in: ["PENDING", "RUNNING", "WAITING"],
        },
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push({
        definitionId: definition.id,
        reason: "An active workflow instance already exists for this record.",
      });
      continue;
    }

    if (
      !evaluateWorkflowCondition(
        definition.conditionExpression,
        context,
      )
    ) {
      skipped.push({
        definitionId: definition.id,
        reason: "Definition condition evaluated to false.",
      });
      continue;
    }

    const instance = await startWorkflow({
      tenantId,
      workflowKey: definition.key,
      resourceType,
      resourceId,
      startedByUserId,
      context,
    });

    launched.push(instance.id);

    await prisma.auditEvent.create({
      data: {
        tenantId,
        userId: startedByUserId,
        actorType: "SYSTEM",
        actorId: "workflow-trigger",
        actorLabel: "Enorsis Workflow Trigger",
        action: "workflow.auto_start",
        resourceType: "WorkflowInstance",
        resourceId: instance.id,
        after: {
          event,
          workflowDefinitionId: definition.id,
          sourceResourceType: resourceType,
          sourceResourceId: resourceId,
          context: context as Prisma.InputJsonValue,
        },
      },
    });
  }

  return {
    matchedDefinitions: definitions.length,
    launched,
    skipped,
  };
}
