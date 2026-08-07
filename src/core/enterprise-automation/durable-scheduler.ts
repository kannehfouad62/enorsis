import { prisma } from "@/lib/prisma";
import { resumeDurableAutomationExecution } from "./durable-runtime";

export async function runDueDurableAutomationExecutions() {
  const now = new Date();

  const executions =
    await prisma.enterpriseAutomationRuntimeExecution.findMany({
      where: {
        OR: [
          { status: "RUNNING" },
          {
            status: "WAITING",
            wakeAt: { lte: now },
          },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: 100,
    });

  const results = [];

  for (const execution of executions) {
    try {
      results.push(
        await resumeDurableAutomationExecution({
          tenantId: execution.tenantId,
          executionId: execution.id,
        }),
      );
    } catch (error) {
      results.push({
        executionId: execution.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown durable runtime failure.",
      });
    }
  }

  return {
    processed: executions.length,
    results,
  };
}
