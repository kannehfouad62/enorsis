"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { buildIntegrationPayload } from "@/core/integrations/exporters";
import { hashWebhookSecret } from "@/core/integrations/security";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createIntegrationConnectionAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const webhookSecret = field(formData, "webhookSecret");

  const integration = await prisma.integrationConnection.create({
    data: {
      tenantId: user.tenantId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      provider: field(formData, "provider") as
        | "SAP"
        | "ORACLE"
        | "MICROSOFT_DYNAMICS"
        | "NETSUITE"
        | "WORKDAY"
        | "COUPA"
        | "ARIBA"
        | "GENERIC_REST"
        | "GENERIC_SFTP"
        | "GENERIC_WEBHOOK"
        | "OTHER",
      direction: field(formData, "direction") as
        | "INBOUND"
        | "OUTBOUND"
        | "BIDIRECTIONAL",
      status: "DRAFT",
      baseUrl: field(formData, "baseUrl") || null,
      secretReference: field(formData, "secretReference") || null,
      webhookSecretHash: webhookSecret
        ? hashWebhookSecret(webhookSecret)
        : null,
      outboundEnabled: formData.get("outboundEnabled") === "on",
      inboundEnabled: formData.get("inboundEnabled") === "on",
      retryLimit: Number(field(formData, "retryLimit") || 3),
      timeoutSeconds: Number(field(formData, "timeoutSeconds") || 30),
      createdByUserId: user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "integration.create",
      resourceType: "IntegrationConnection",
      resourceId: integration.id,
      after: {
        key: integration.key,
        provider: integration.provider,
        direction: integration.direction,
      },
    },
  });

  revalidatePath("/app/settings/integrations");
}

export async function activateIntegrationConnectionAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const integrationId = field(formData, "integrationId");
  const integration = await prisma.integrationConnection.findFirstOrThrow({
    where: { id: integrationId, tenantId: user.tenantId },
  });

  if (
    integration.outboundEnabled &&
    !integration.baseUrl &&
    integration.provider !== "GENERIC_SFTP"
  ) {
    throw new Error("Outbound REST integrations require a base URL.");
  }

  await prisma.integrationConnection.update({
    where: { id: integration.id },
    data: {
      status: "ACTIVE",
      lastError: null,
    },
  });

  revalidatePath(`/app/settings/integrations/${integration.id}`);
  revalidatePath("/app/settings/integrations");
}

export async function createIntegrationMappingAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const integrationId = field(formData, "integrationId");
  await prisma.integrationConnection.findFirstOrThrow({
    where: { id: integrationId, tenantId: user.tenantId },
  });

  const parseJson = (value: string, label: string) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
  };

  await prisma.integrationMapping.create({
    data: {
      integrationId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      sourceEntity: field(formData, "sourceEntity"),
      targetEntity: field(formData, "targetEntity"),
      fieldMappings: parseJson(
        field(formData, "fieldMappings"),
        "Field mappings",
      ),
      transforms: field(formData, "transforms")
        ? parseJson(field(formData, "transforms"), "Transforms")
        : null,
      validationRules: field(formData, "validationRules")
        ? parseJson(
            field(formData, "validationRules"),
            "Validation rules",
          )
        : null,
    },
  });

  revalidatePath(`/app/settings/integrations/${integrationId}`);
}

export async function queueIntegrationJobAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const integrationId = field(formData, "integrationId");
  const resourceType = field(formData, "resourceType");
  const resourceId = field(formData, "resourceId");

  const integration = await prisma.integrationConnection.findFirstOrThrow({
    where: {
      id: integrationId,
      tenantId: user.tenantId,
      status: "ACTIVE",
      outboundEnabled: true,
    },
  });

  const payload = await buildIntegrationPayload({
    tenantId: user.tenantId,
    resourceType,
    resourceId,
  });

  await prisma.integrationJob.create({
    data: {
      integrationId: integration.id,
      direction: "OUTBOUND",
      status: "QUEUED",
      resourceType,
      resourceId,
      payload,
      correlationId: crypto.randomUUID(),
      createdByUserId: user.id,
      nextAttemptAt: new Date(),
    },
  });

  revalidatePath(`/app/settings/integrations/${integration.id}`);
  revalidatePath("/app/settings/integrations/jobs");
}

export async function retryIntegrationJobAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const jobId = field(formData, "jobId");
  const job = await prisma.integrationJob.findFirstOrThrow({
    where: {
      id: jobId,
      integration: { tenantId: user.tenantId },
      status: { in: ["FAILED", "DEAD_LETTER"] },
    },
    include: { integration: true },
  });

  await prisma.integrationJob.update({
    where: { id: job.id },
    data: {
      status: "QUEUED",
      nextAttemptAt: new Date(),
      errorMessage: null,
    },
  });

  revalidatePath("/app/settings/integrations/jobs");
  revalidatePath(`/app/settings/integrations/${job.integrationId}`);
}
