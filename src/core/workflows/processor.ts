import { prisma } from "@/lib/prisma";

export async function processWorkflowSla(limit = 100) {
  const now = new Date();

  const [overdueTasks, escalations] = await Promise.all([
    prisma.workflowTask.findMany({
      where: {
        status: { in: ["AVAILABLE", "IN_PROGRESS"] },
        dueAt: { lte: now },
      },
      take: limit,
    }),
    prisma.workflowEscalation.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      take: limit,
    }),
  ]);

  if (overdueTasks.length > 0) {
    await prisma.workflowTask.updateMany({
      where: { id: { in: overdueTasks.map((task) => task.id) } },
      data: { status: "ESCALATED" },
    });
  }

  for (const escalation of escalations) {
    await prisma.$transaction([
      prisma.workflowEscalation.update({
        where: { id: escalation.id },
        data: { status: "SENT", sentAt: new Date() },
      }),
      prisma.auditEvent.create({
        data: {
          actorType: "SYSTEM",
          actorId: "workflow-sla-processor",
          actorLabel: "Enorsis Workflow SLA Processor",
          action: "workflow.escalate",
          resourceType: "WorkflowInstance",
          resourceId: escalation.workflowInstanceId,
          after: {
            escalationLevel: escalation.escalationLevel,
            targetRoles: escalation.targetRoles,
            targetUserIds: escalation.targetUserIds,
            reason: escalation.reason,
          },
        },
      }),
    ]);
  }

  return {
    overdueTasks: overdueTasks.length,
    escalationsSent: escalations.length,
  };
}
