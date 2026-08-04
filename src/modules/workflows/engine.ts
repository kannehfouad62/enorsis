import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateWorkflowCondition } from "./conditions";

export async function startWorkflow({
  tenantId,
  workflowKey,
  resourceType,
  resourceId,
  startedByUserId,
  context,
}: {
  tenantId: string;
  workflowKey: string;
  resourceType: string;
  resourceId: string;
  startedByUserId: string;
  context: Record<string, unknown>;
}) {
  const definition = await prisma.workflowDefinition.findFirstOrThrow({
    where: {
      tenantId,
      key: workflowKey,
      resourceType,
      status: "ACTIVE",
    },
    include: {
      steps: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { version: "desc" },
  });

  if (!evaluateWorkflowCondition(definition.conditionExpression, context)) {
    throw new Error(
      "The workflow trigger conditions were not satisfied.",
    );
  }

  const instance = await prisma.workflowInstance.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      resourceType,
      resourceId,
      status: "RUNNING",
      currentSequence: 1,
      context: context as Prisma.InputJsonValue,
      startedByUserId,
      startedAt: new Date(),
    },
  });

  await activateWorkflowSequence(instance.id, 1);

  return instance;
}

export async function activateWorkflowSequence(
  workflowInstanceId: string,
  sequence: number,
): Promise<void> {
  const instance = await prisma.workflowInstance.findUniqueOrThrow({
    where: { id: workflowInstanceId },
    include: {
      workflowDefinition: {
        include: {
          steps: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  const step = instance.workflowDefinition.steps.find(
    (item) => item.sequence === sequence,
  );

  if (!step) {
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return;
  }

  const workflowContext =
    instance.context &&
    typeof instance.context === "object" &&
    !Array.isArray(instance.context)
      ? (instance.context as Record<string, unknown>)
      : {};

  if (
    !evaluateWorkflowCondition(
      step.conditionExpression,
      workflowContext,
    )
  ) {
    await prisma.workflowTask.create({
      data: {
        workflowInstanceId: instance.id,
        workflowStepId: step.id,
        status: "SKIPPED",
        availableAt: new Date(),
        decidedAt: new Date(),
        comments: "Step condition evaluated to false.",
      },
    });

    await activateWorkflowSequence(instance.id, sequence + 1);
    return;
  }

  const now = new Date();
  const dueAt = step.dueInHours
    ? new Date(now.getTime() + step.dueInHours * 60 * 60 * 1000)
    : null;

  const directAssignees = step.assigneeUserIds;
  const roleAssignees = step.assigneeRoles;

  if (directAssignees.length === 0 && roleAssignees.length === 0) {
    throw new Error(`Workflow step ${step.name} has no assignees.`);
  }

  await prisma.$transaction(async (tx) => {
    if (directAssignees.length > 0) {
      await tx.workflowTask.createMany({
        data: directAssignees.map((assigneeUserId) => ({
          workflowInstanceId: instance.id,
          workflowStepId: step.id,
          status: "AVAILABLE",
          assigneeUserId,
          availableAt: now,
          dueAt,
        })),
      });
    }

    if (roleAssignees.length > 0) {
      await tx.workflowTask.createMany({
        data: roleAssignees.map((assigneeRole) => ({
          workflowInstanceId: instance.id,
          workflowStepId: step.id,
          status: "AVAILABLE",
          assigneeRole,
          availableAt: now,
          dueAt,
        })),
      });
    }

    await tx.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: "WAITING",
        currentSequence: sequence,
      },
    });

    if (step.escalationAfterHours) {
      await tx.workflowEscalation.create({
        data: {
          workflowInstanceId: instance.id,
          status: "PENDING",
          escalationLevel: 1,
          targetRoles: step.escalationRoles,
          targetUserIds: [],
          reason:
            `Workflow step ${step.name} exceeded its ` +
            "escalation threshold.",
          scheduledAt: new Date(
            now.getTime() +
              step.escalationAfterHours * 60 * 60 * 1000,
          ),
        },
      });
    }
  });
}

export async function processWorkflowDecision({
  taskId,
  userId,
  userRoles,
  decision,
  comments,
}: {
  taskId: string;
  userId: string;
  userRoles: string[];
  decision: "APPROVE" | "REJECT" | "RETURN" | "COMPLETE";
  comments?: string;
}): Promise<void> {
  const task = await prisma.workflowTask.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      workflowStep: true,
      workflowInstance: true,
    },
  });

  const assigned =
    task.assigneeUserId === userId ||
    Boolean(
      task.assigneeRole &&
        userRoles.includes(task.assigneeRole),
    );

  const actionableStatuses = [
    "AVAILABLE",
    "IN_PROGRESS",
    "ESCALATED",
  ] as const;

  if (
    !assigned ||
    !actionableStatuses.includes(
      task.status as (typeof actionableStatuses)[number],
    )
  ) {
    throw new Error(
      "This workflow task is not available to the current user.",
    );
  }

  if (task.workflowStep.requiresComment && !comments?.trim()) {
    throw new Error(
      "A comment is required for this workflow decision.",
    );
  }

  if (decision === "REJECT") {
    await prisma.$transaction([
      prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          status: "REJECTED",
          decision,
          comments: comments?.trim() || null,
          completedByUserId: userId,
          decidedAt: new Date(),
        },
      }),
      prisma.workflowInstance.update({
        where: { id: task.workflowInstanceId },
        data: {
          status: "REJECTED",
          completedAt: new Date(),
        },
      }),
      prisma.workflowTask.updateMany({
        where: {
          workflowInstanceId: task.workflowInstanceId,
          id: { not: task.id },
          status: {
            in: ["AVAILABLE", "IN_PROGRESS", "ESCALATED"],
          },
        },
        data: {
          status: "CANCELLED",
          decidedAt: new Date(),
        },
      }),
    ]);

    return;
  }

  if (decision === "RETURN") {
    await prisma.$transaction([
      prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          status: "RETURNED",
          decision,
          comments: comments?.trim() || null,
          completedByUserId: userId,
          decidedAt: new Date(),
        },
      }),
      prisma.workflowInstance.update({
        where: { id: task.workflowInstanceId },
        data: {
          status: "WAITING",
        },
      }),
    ]);

    return;
  }

  await prisma.workflowTask.update({
    where: { id: task.id },
    data: {
      status: "APPROVED",
      decision,
      comments: comments?.trim() || null,
      completedByUserId: userId,
      decidedAt: new Date(),
    },
  });

  const remainingTasks = await prisma.workflowTask.count({
    where: {
      workflowInstanceId: task.workflowInstanceId,
      workflowStepId: task.workflowStepId,
      status: {
        in: ["AVAILABLE", "IN_PROGRESS", "ESCALATED"],
      },
    },
  });

  const stepComplete =
    task.workflowStep.routingMode === "ANY_ONE" ||
    remainingTasks === 0;

  if (!stepComplete) {
    return;
  }

  if (task.workflowStep.routingMode === "ANY_ONE") {
    await prisma.workflowTask.updateMany({
      where: {
        workflowInstanceId: task.workflowInstanceId,
        workflowStepId: task.workflowStepId,
        id: { not: task.id },
        status: {
          in: ["AVAILABLE", "IN_PROGRESS", "ESCALATED"],
        },
      },
      data: {
        status: "SKIPPED",
        decidedAt: new Date(),
      },
    });
  }

  await activateWorkflowSequence(
    task.workflowInstanceId,
    task.workflowStep.sequence + 1,
  );
}