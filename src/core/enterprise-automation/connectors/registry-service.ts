import { prisma } from "@/lib/prisma";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function resolveAutomationConnectorConfiguration(input: {
  tenantId: string;
  connectorKey: string;
}) {
  const connector =
    await prisma.enterpriseAutomationConnector.findFirstOrThrow({
      where: {
        tenantId: input.tenantId,
        connectorKey: input.connectorKey,
        status: "ACTIVE",
      },
    });

  return {
    connector,
    configuration: {
      url: connector.baseUrl ?? "",
      allowedHosts: asStringArray(connector.allowedHosts),
      secretEnvKey: connector.secretEnvKey ?? null,
      headers: asObject(connector.defaultHeaders) as Record<string, string>,
      timeoutMs: connector.timeoutMs,
      ...asObject(connector.configuration),
    },
  };
}

export async function recordAutomationConnectorUsage(
  connectorId: string,
) {
  await prisma.enterpriseAutomationConnector.update({
    where: { id: connectorId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}
