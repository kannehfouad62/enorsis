"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { testAutomationConnector } from "@/core/enterprise-automation/connectors/test-service";
import { recordAutomationConnectorAudit } from "@/core/enterprise-automation/connectors/audit-service";

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

  const created = await prisma.enterpriseAutomationConnector.create({
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
      secretEnvKey: field(data, "secretEnvKey") || null,
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
      ownerUserId: user.id,
    },
  });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId: created.id,
    type: "CREATED",
    actorUserId: user.id,
    message: "Connector registered.",
  });

  revalidatePath("/app/automation/connectors");
}

export async function setAutomationConnectorStatusAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const connectorId = field(data, "connectorId");
  const nextStatus = field(data, "status") as
    | "ACTIVE"
    | "DISABLED"
    | "ARCHIVED";

  await prisma.enterpriseAutomationConnector.updateMany({
    where: {
      id: connectorId,
      tenantId: user.tenantId,
    },
    data: {
      status: nextStatus,
      updatedByUserId: user.id,
    },
  });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId,
    type:
      nextStatus === "ACTIVE"
        ? "ACTIVATED"
        : nextStatus === "DISABLED"
          ? "DISABLED"
          : "ARCHIVED",
    actorUserId: user.id,
    message: `Connector status changed to ${nextStatus}.`,
  });

  revalidatePath("/app/automation/connectors");
}

export async function testAutomationConnectorAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const connectorId = field(data, "connectorId");

  const result = await testAutomationConnector({
    tenantId: user.tenantId,
    connectorId,
  });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId,
    type: "TESTED",
    actorUserId: user.id,
    message:
      result.message ??
      (result.ok
        ? "Connector test passed."
        : "Connector test failed."),
    metadata: { ok: result.ok },
  });

  if (result.ok && result.recovered) {
    await recordAutomationConnectorAudit({
      tenantId: user.tenantId,
      connectorId,
      type: "CIRCUIT_RECOVERY_SUCCEEDED",
      actorUserId: user.id,
      message:
        "Connector governance test succeeded and reset the circuit failure streak.",
    });
  }

  revalidatePath("/app/automation/connectors");
  revalidatePath("/app/automation/connectors/observability");
}
