import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { toJson } from "@/lib/prisma-json";
import { getEnterpriseConnectorAdapter } from "./registry";

export async function runConnectorHealthCheck(connectionId: string) {
  const connection =
    await prisma.enterpriseConnectorConnection.findUniqueOrThrow({
      where: { id: connectionId },
      include: {
        connectorDefinition: true,
        credentials: {
          where: { status: "ACTIVE" },
        },
      },
    });

  const adapter = getEnterpriseConnectorAdapter(
    connection.connectorDefinition.key,
  );

  if (!adapter) {
    throw new Error(
      `No adapter is registered for ${connection.connectorDefinition.key}.`,
    );
  }

  const result = await adapter.healthCheck({
    tenantId: connection.tenantId,
    connectionId: connection.id,
    configuration: asRecord(connection.configuration),
    secretReferences: connection.credentials.map(
      (credential) => credential.secretReference,
    ),
  });

  await prisma.enterpriseConnectorConnection.update({
    where: { id: connection.id },
    data: {
      healthStatus: result.healthy ? "HEALTHY" : "UNHEALTHY",
      lastHealthCheckAt: new Date(),
      configuration: toJson({
        ...asRecord(connection.configuration),
        lastHealthMessage: result.message,
        lastHealthDetails: result.details ?? {},
      }),
    },
  });

  return result;
}

export async function queueIntegrationSync({
  connectionId,
  mappingId,
  direction,
  requestedByUserId,
  triggerType = "MANUAL",
}: {
  connectionId: string;
  mappingId?: string | null;
  direction: "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";
  requestedByUserId?: string | null;
  triggerType?: string;
}) {
  return prisma.enterpriseIntegrationSyncRun.create({
    data: {
      connectionId,
      mappingId: mappingId ?? null,
      direction,
      triggerType,
      requestedByUserId: requestedByUserId ?? null,
      correlationId: randomUUID(),
    },
  });
}

export async function processQueuedIntegrationSyncs({
  limit = 10,
}: {
  limit?: number;
}) {
  const runs = await prisma.enterpriseIntegrationSyncRun.findMany({
    where: { status: "QUEUED" },
    include: {
      connection: {
        include: {
          connectorDefinition: true,
          credentials: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results = [];

  for (const run of runs) {
    const claimed =
      await prisma.enterpriseIntegrationSyncRun.updateMany({
        where: { id: run.id, status: "QUEUED" },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });

    if (claimed.count === 0) continue;

    results.push(await executeIntegrationSync(run.id));
  }

  return results;
}

export async function executeIntegrationSync(runId: string) {
  const run =
    await prisma.enterpriseIntegrationSyncRun.findUniqueOrThrow({
      where: { id: runId },
      include: {
        connection: {
          include: {
            connectorDefinition: true,
            credentials: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    });

  const adapter = getEnterpriseConnectorAdapter(
    run.connection.connectorDefinition.key,
  );

  if (!adapter) {
    return failSync(
      run.id,
      `No adapter is registered for ${run.connection.connectorDefinition.key}.`,
    );
  }

  try {
    const result = await adapter.runSync({
      tenantId: run.connection.tenantId,
      connectionId: run.connection.id,
      configuration: asRecord(run.connection.configuration),
      secretReferences: run.connection.credentials.map(
        (credential) => credential.secretReference,
      ),
      direction: run.direction,
      mappingId: run.mappingId,
      cursor: run.cursor,
    });

    const now = new Date();

    await prisma.$transaction([
      prisma.enterpriseIntegrationSyncRun.update({
        where: { id: run.id },
        data: {
          status:
            result.recordsFailed > 0
              ? "PARTIALLY_SUCCEEDED"
              : "SUCCEEDED",
          recordsRead: result.recordsRead,
          recordsWritten: result.recordsWritten,
          recordsSkipped: result.recordsSkipped,
          recordsFailed: result.recordsFailed,
          summary: toJson(result.summary ?? {}),
          completedAt: now,
        },
      }),
      prisma.enterpriseConnectorConnection.update({
        where: { id: run.connectionId },
        data: {
          status: "ACTIVE",
          lastSuccessfulSyncAt: now,
        },
      }),
    ]);

    await publishDomainEvent({
      tenantId: run.connection.tenantId,
      eventType: "Integration.SyncCompleted",
      aggregateType: "EnterpriseIntegrationSyncRun",
      aggregateId: run.id,
      sourceModule: "integration-hub",
      correlationId: run.correlationId,
      payload: {
        connectionId: run.connectionId,
        status:
          result.recordsFailed > 0
            ? "PARTIALLY_SUCCEEDED"
            : "SUCCEEDED",
        ...result,
      },
    });

    return { runId: run.id, status: "SUCCEEDED" as const };
  } catch (error) {
    return failSync(
      run.id,
      error instanceof Error ? error.message : "Unknown integration error.",
    );
  }
}

async function failSync(runId: string, message: string) {
  const run =
    await prisma.enterpriseIntegrationSyncRun.findUniqueOrThrow({
      where: { id: runId },
      include: { connection: true },
    });

  const now = new Date();

  await prisma.$transaction([
    prisma.enterpriseIntegrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: now,
      },
    }),
    prisma.enterpriseConnectorConnection.update({
      where: { id: run.connectionId },
      data: {
        status: "ERROR",
        healthStatus: "UNHEALTHY",
        lastFailedSyncAt: now,
      },
    }),
  ]);

  return { runId: run.id, status: "FAILED" as const };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
