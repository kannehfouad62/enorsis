import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { resumeDurableAutomationExecution } from "./durable-runtime";

export async function recoverDurableAutomationExecution(input: {
  tenantId: string;
  executionId: string;
  actorUserId: string;
  nodeId?: string | null;
}) {
  const execution = await prisma.enterpriseAutomationRuntimeExecution.findFirstOrThrow({
    where: { id: input.executionId, tenantId: input.tenantId },
  });

  if (execution.status !== "FAILED" && execution.status !== "WAITING") {
    throw new Error("Only failed or waiting executions can be recovered.");
  }

  const target = input.nodeId
    ? await prisma.enterpriseAutomationRuntimeNode.findFirstOrThrow({
        where: { executionId: execution.id, nodeId: input.nodeId },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.enterpriseAutomationRuntimeNode.findFirstOrThrow({
        where: { executionId: execution.id, status: "FAILED" },
        orderBy: { updatedAt: "desc" },
      });

  await prisma.$transaction([
    prisma.enterpriseAutomationRuntimeNode.update({
      where: { id: target.id },
      data: {
        status: "READY",
        availableAt: null,
        timeoutAt: null,
        waitReason: null,
        lastError: null,
        failureCode: null,
      },
    }),
    prisma.enterpriseAutomationRuntimeExecution.update({
      where: { id: execution.id },
      data: {
        status: "RUNNING",
        completedAt: null,
        lastError: null,
        wakeAt: null,
        recoveryCount: { increment: 1 },
        lastRecoveredAt: new Date(),
        recoveredByUserId: input.actorUserId,
      },
    }),
    prisma.enterpriseAutomationRuntimeSignal.create({
      data: {
        tenantId: input.tenantId,
        executionId: execution.id,
        signalType: "RECOVER",
        correlationKey: target.nodeId,
        payload: toJson({ recoveredCheckpointId: target.id }),
        createdByUserId: input.actorUserId,
        consumedAt: new Date(),
      },
    }),
  ]);

  return resumeDurableAutomationExecution({
    tenantId: input.tenantId,
    executionId: execution.id,
  });
}
