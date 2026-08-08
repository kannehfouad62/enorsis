"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { testAutomationConnector } from "@/core/enterprise-automation/connectors/test-service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const adminRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PLATFORM_SUPER_ADMIN",
] as const;

function parseHosts(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createAutomationConnectorAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);

  const connectorKey = field(data, "connectorKey")
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_");

  await prisma.enterpriseAutomationConnector.create({
    data: {
      tenantId: user.tenantId,
      connectorKey,
      name: field(data, "name"),
      type: field(data, "type") as
        | "HTTP"
        | "WEBHOOK"
        | "DOMAIN_EVENT",
      status: "ACTIVE",
      baseUrl: field(data, "baseUrl") || null,
      allowedHosts: toJson(
        parseHosts(field(data, "allowedHosts")),
      ),
      secretEnvKey:
        field(data, "secretEnvKey") || null,
      defaultHeaders: toJson({}),
      configuration: toJson({}),
      timeoutMs: Math.max(
        1000,
        Math.min(
          120000,
          Number(field(data, "timeoutMs") || 15000),
        ),
      ),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/automation/connectors");
}

export async function setAutomationConnectorStatusAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);

  await prisma.enterpriseAutomationConnector.updateMany({
    where: {
      id: field(data, "connectorId"),
      tenantId: user.tenantId,
    },
    data: {
      status: field(data, "status") as
        | "ACTIVE"
        | "DISABLED"
        | "ARCHIVED",
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/automation/connectors");
}

export async function testAutomationConnectorAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);

  await testAutomationConnector({
    tenantId: user.tenantId,
    connectorId: field(data, "connectorId"),
  });

  revalidatePath("/app/automation/connectors");
}
