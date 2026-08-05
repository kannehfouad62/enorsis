import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getPlatformJobHandler } from "./registry";
import { toJson } from "@/lib/prisma-json";

export async function queuePlatformJob({
  jobKey,
  tenantId,
  triggerType = "MANUAL",
  payload = {},
  requestedByUserId,
  correlationId = randomUUID(),
}: {
  jobKey: string;
  tenantId?: string | null;
  triggerType?: "SCHEDULED" | "MANUAL" | "EVENT" | "RETRY";
  payload?: Record<string, unknown>;
  requestedByUserId?: string | null;
  correlationId?: string;
}) {
  const definition = await prisma.platformJobDefinition.findUniqueOrThrow({
    where: { key: jobKey },
  });

  if (definition.status !== "ACTIVE") {
    throw new Error(`Platform job ${jobKey} is not active.`);
  }

  if (definition.tenantScoped && !tenantId) {
    throw new Error(`Platform job ${jobKey} requires a tenant.`);
  }

  return prisma.platformJobExecution.create({
    data: {
      jobDefinitionId: definition.id,
      tenantId: tenantId ?? null,
      triggerType,
      payload: toJson(payload),
      requestedByUserId: requestedByUserId ?? null,
      correlationId,
    },
  });
}

export async function processQueuedPlatformJobs({
  workerId,
  limit = 10,
}: {
  workerId: string;
  limit?: number;
}) {
  const queued = await prisma.platformJobExecution.findMany({
    where: { status: "QUEUED" },
    include: { jobDefinition: true },
    orderBy: { queuedAt: "asc" },
    take: limit,
  });

  const results = [];

  for (const execution of queued) {
    const claimed = await prisma.platformJobExecution.updateMany({
      where: {
        id: execution.id,
        status: "QUEUED",
        lockedAt: null,
      },
      data: {
        status: "RUNNING",
        lockedAt: new Date(),
        lockedBy: workerId,
        startedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (claimed.count === 0) continue;

    results.push(await executePlatformJob(execution.id, workerId));
  }

  return results;
}

export async function executePlatformJob(
  executionId: string,
  workerId: string,
) {
  const execution = await prisma.platformJobExecution.findUniqueOrThrow({
    where: { id: executionId },
    include: { jobDefinition: true },
  });

  const attemptNumber = execution.attemptCount + 1;
  const attempt = await prisma.platformJobAttempt.create({
    data: {
      executionId,
      attemptNumber,
      status: "RUNNING",
      workerId,
    },
  });

  const started = Date.now();
  const handler = getPlatformJobHandler(execution.jobDefinition.handlerKey);

  if (!handler) {
    return failExecution({
      executionId,
      attemptId: attempt.id,
      started,
      code: "HANDLER_NOT_REGISTERED",
      message: `No handler is registered for ${execution.jobDefinition.handlerKey}.`,
    });
  }

  try {
    const payload =
      execution.payload &&
      typeof execution.payload === "object" &&
      !Array.isArray(execution.payload)
        ? (execution.payload as Record<string, unknown>)
        : {};

    const result = await handler({
      executionId,
      tenantId: execution.tenantId,
      payload,
      correlationId: execution.correlationId,
    });

    const now = new Date();

    await prisma.$transaction([
      prisma.platformJobAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "SUCCEEDED",
          completedAt: now,
          durationMs: Date.now() - started,
          result: toJson(result),
        },
      }),
      prisma.platformJobExecution.update({
        where: { id: executionId },
        data: {
          status: "SUCCEEDED",
          completedAt: now,
          result: toJson(result),
          lockedAt: null,
          lockedBy: null,
        },
      }),
      prisma.platformJobDefinition.update({
        where: { id: execution.jobDefinitionId },
        data: {
          lastStartedAt: execution.startedAt ?? now,
          lastCompletedAt: now,
          lastSucceededAt: now,
        },
      }),
    ]);

    return { executionId, status: "SUCCEEDED" as const };
  } catch (error) {
    return failExecution({
      executionId,
      attemptId: attempt.id,
      started,
      code: "JOB_HANDLER_FAILED",
      message:
        error instanceof Error ? error.message : "Unknown job failure.",
    });
  }
}

async function failExecution({
  executionId,
  attemptId,
  started,
  code,
  message,
}: {
  executionId: string;
  attemptId: string;
  started: number;
  code: string;
  message: string;
}) {
  const execution = await prisma.platformJobExecution.findUniqueOrThrow({
    where: { id: executionId },
    include: { jobDefinition: true },
  });

  const exhausted =
    execution.attemptCount >= execution.jobDefinition.maxAttempts;
  const now = new Date();

  await prisma.$transaction([
    prisma.platformJobAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        completedAt: now,
        durationMs: Date.now() - started,
        errorCode: code,
        errorMessage: message,
      },
    }),
    prisma.platformJobExecution.update({
      where: { id: executionId },
      data: {
        status: exhausted ? "DEAD_LETTER" : "QUEUED",
        errorCode: code,
        errorMessage: message,
        completedAt: exhausted ? now : null,
        lockedAt: null,
        lockedBy: null,
      },
    }),
    prisma.platformJobDefinition.update({
      where: { id: execution.jobDefinitionId },
      data: {
        lastCompletedAt: exhausted ? now : undefined,
        lastFailedAt: now,
      },
    }),
  ]);

  return {
    executionId,
    status: exhausted ? ("DEAD_LETTER" as const) : ("QUEUED" as const),
  };
}
