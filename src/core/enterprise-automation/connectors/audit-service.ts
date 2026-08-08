import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

export async function recordAutomationConnectorAudit(input: {
  tenantId: string;
  connectorId: string;
  type:
    | "CREATED"
    | "UPDATED"
    | "ACTIVATED"
    | "DISABLED"
    | "ARCHIVED"
    | "TESTED"
    | "EXECUTED"
    | "EXECUTION_FAILED"
    | "POLICY_BLOCKED"
    | "CIRCUIT_OPENED"
    | "CIRCUIT_BLOCKED"
    | "CIRCUIT_RECOVERY_SUCCEEDED"
    | "CIRCUIT_RECOVERY_FAILED"
    | "SLA_BREACH_DETECTED"
    | "SLA_RECOVERED"
    | "RELIABILITY_POLICY_UPDATED"
    | "REMEDIATION_TRIGGERED"
    | "REMEDIATION_SUCCEEDED"
    | "REMEDIATION_FAILED";
  actorUserId?: string | null;
  actionId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.enterpriseAutomationConnectorAudit.create({
    data: {
      tenantId: input.tenantId,
      connectorId: input.connectorId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      actionId: input.actionId ?? null,
      message: input.message ?? null,
      metadata: toJson(input.metadata ?? {}),
    },
  });
}
