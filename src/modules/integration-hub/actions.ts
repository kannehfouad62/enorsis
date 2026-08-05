"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  queueIntegrationSync,
  runConnectorHealthCheck,
} from "@/core/integrations";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function seedConnectorCatalogAction() {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const catalog = [
    ["sap-s4hana", "SAP S/4HANA", "SAP", "ERP"],
    ["oracle-fusion", "Oracle Fusion Cloud", "Oracle", "ERP"],
    ["dynamics-365", "Microsoft Dynamics 365", "Microsoft", "ERP"],
    ["netsuite", "NetSuite", "Oracle", "ERP"],
    ["workday", "Workday", "Workday", "ERP"],
    ["microsoft-365", "Microsoft 365", "Microsoft", "COLLABORATION"],
    ["generic-rest", "Generic REST API", "Enorsis", "REST_API"],
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
      configuration: toJson({}),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/integration-hub");
}

export async function addConnectorCredentialAction(
  data: FormData,
) {
  await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.enterpriseConnectorCredential.create({
    data: {
      connectionId: field(data, "connectionId"),
      name: field(data, "name"),
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
