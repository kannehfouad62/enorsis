"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  ENTERPRISE_INTEGRATION_PROVIDER_PROFILES,
  queueIntegrationSync,
  runConnectorHealthCheck,
} from "@/core/integrations";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

function parseJsonRecord(value: string) {
  if (!value) return {};

  const parsed: unknown = JSON.parse(value);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error("Mapping JSON must be an object.");
  }

  return parsed as Record<string, unknown>;
}

export async function seedConnectorCatalogAction() {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const catalog = [
    ...ENTERPRISE_INTEGRATION_PROVIDER_PROFILES.map(
      (profile) =>
        [
          profile.definitionKey,
          profile.name,
          profile.provider,
          profile.family === "BANKING" ||
          profile.family === "SOURCE_TO_PAY"
            ? "ERP"
            : profile.family,
        ] as const,
    ),
    ["netsuite", "NetSuite", "Oracle", "ERP"],
    ["workday", "Workday", "Workday", "ERP"],
    ["microsoft-365", "Microsoft 365", "Microsoft", "COLLABORATION"],
    ["generic-webhook", "Generic Webhook", "Enorsis", "WEBHOOK"],
    ["generic-sftp", "Generic SFTP", "Enorsis", "SFTP"],
  ] as const;

  for (const [key, name, provider, connectorType] of catalog) {
    await prisma.enterpriseConnectorDefinition.upsert({
      where: { key },
      create: {
        key,
        name,
        provider,
        connectorType,
        supportsInbound: true,
        supportsOutbound: true,
        supportsWebhooks: connectorType === "WEBHOOK",
        supportsIncremental: true,
      },
      update: {
        name,
        provider,
        connectorType,
        active: true,
      },
    });
  }

  revalidatePath("/app/settings/integration-hub");
}

export async function createConnectorConnectionAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.enterpriseConnectorConnection.create({
    data: {
      tenantId: user.tenantId,
      connectorDefinitionId: field(
        data,
        "connectorDefinitionId",
      ),
      name: field(data, "name"),
      environment: field(data, "environment") || "PRODUCTION",
      baseUrl: field(data, "baseUrl") || null,
      configuration: toJson(
        parseJsonRecord(field(data, "configuration")),
      ),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function addConnectorCredentialAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const connectionId = field(data, "connectionId");
  const name = field(data, "name");

  const connection =
    await prisma.enterpriseConnectorConnection.findFirstOrThrow({
      where: {
        id: connectionId,
        tenantId: user.tenantId,
      },
      select: { id: true },
    });

  const existing =
    await prisma.enterpriseConnectorCredential.findFirst({
      where: {
        connectionId: connection.id,
        name,
      },
      select: { id: true },
    });

  const dataToWrite = {
    name,
    credentialType: field(data, "credentialType") as
      | "API_KEY"
      | "BEARER_TOKEN"
      | "BASIC_AUTH"
      | "OAUTH2"
      | "CLIENT_CERTIFICATE"
      | "SSH_KEY"
      | "DATABASE_CREDENTIAL"
      | "CUSTOM",
    secretReference: field(data, "secretReference"),
    expiresAt: field(data, "expiresAt")
      ? new Date(field(data, "expiresAt"))
      : null,
    status: "ACTIVE" as const,
  };

  if (existing) {
    await prisma.enterpriseConnectorCredential.update({
      where: { id: existing.id },
      data: dataToWrite,
    });
  } else {
    await prisma.enterpriseConnectorCredential.create({
      data: {
        connectionId: connection.id,
        ...dataToWrite,
      },
    });
  }

  revalidatePath("/app/settings/integration-hub");
}

export async function createConnectorMappingAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const connectionId = field(data, "connectionId");

  const connection =
    await prisma.enterpriseConnectorConnection.findFirstOrThrow({
      where: {
        id: connectionId,
        tenantId: user.tenantId,
      },
    });

  await prisma.enterpriseConnectorMapping.create({
    data: {
      connectionId: connection.id,
      name: field(data, "name"),
      sourceObject: field(data, "sourceObject"),
      targetObject: field(data, "targetObject"),
      direction: field(data, "direction") as
        | "INBOUND"
        | "OUTBOUND"
        | "BIDIRECTIONAL",
      fieldMappings: toJson(
        parseJsonRecord(field(data, "fieldMappings")),
      ),
      transformationRules: toJson(
        parseJsonRecord(
          field(data, "transformationRules"),
        ),
      ),
      active: true,
    },
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function queueConnectorSyncAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await queueIntegrationSync({
    connectionId: field(data, "connectionId"),
    mappingId: field(data, "mappingId") || null,
    direction: field(data, "direction") as
      | "INBOUND"
      | "OUTBOUND"
      | "BIDIRECTIONAL",
    requestedByUserId: user.id,
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function healthCheckConnectorAction(data: FormData) {
  await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await runConnectorHealthCheck(field(data, "connectionId"));
  revalidatePath("/app/settings/integration-hub");
}

export async function deleteConnectorCredentialAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const credential =
    await prisma.enterpriseConnectorCredential.findFirstOrThrow({
      where: {
        id: field(data, "credentialId"),
        connection: {
          tenantId: user.tenantId,
        },
      },
      select: { id: true },
    });

  await prisma.enterpriseConnectorCredential.delete({
    where: { id: credential.id },
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function updateConnectorStatusAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const status = field(data, "status") as
    | "DRAFT"
    | "ACTIVE"
    | "PAUSED"
    | "ERROR";

  await prisma.enterpriseConnectorConnection.updateMany({
    where: {
      id: field(data, "connectionId"),
      tenantId: user.tenantId,
    },
    data: {
      status,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function retryConnectorSyncAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const runId = field(data, "runId");

  const run =
    await prisma.enterpriseIntegrationSyncRun.findFirstOrThrow({
      where: {
        id: runId,
        connection: {
          tenantId: user.tenantId,
        },
      },
      select: {
        connectionId: true,
        mappingId: true,
        direction: true,
      },
    });

  await queueIntegrationSync({
    connectionId: run.connectionId,
    mappingId: run.mappingId,
    direction: run.direction,
    requestedByUserId: user.id,
    triggerType: "RETRY",
  });

  revalidatePath("/app/settings/integration-hub");
  revalidatePath(
    `/app/settings/integration-hub/runs/${runId}`,
  );
}
