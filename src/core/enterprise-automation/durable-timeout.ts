import { prisma } from "@/lib/prisma";

export async function failTimedOutDurableAutomationNodes() {
  const now = new Date();
  const timedOut = await prisma.enterpriseAutomationRuntimeNode.findMany({
    where: {
      status: { in: ["RUNNING", "WAITING"] },
      timeoutAt: { lte: now },
    },
    take: 100,
    orderBy: { timeoutAt: "asc" },
  });

  for (const node of timedOut) {
    await prisma.$transaction([
      prisma.enterpriseAutomationRuntimeNode.update({
        where: { id: node.id },
        data: {
          status: "FAILED",
          completedAt: now,
          lastError: "Runtime node exceeded its timeout policy.",
          failureCode: "TIMEOUT",
        },
      }),
      prisma.enterpriseAutomationRuntimeExecution.update({
        where: { id: node.executionId },
        data: {
          status: "FAILED",
          completedAt: now,
          lastError: `Node ${node.nodeId} timed out.`,
          wakeAt: null,
        },
      }),
    ]);
  }

  return { timedOut: timedOut.length };
}
