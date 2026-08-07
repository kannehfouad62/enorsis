"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  signalDurableAutomationExecution,
  startDurableAutomationExecution,
} from "@/core/enterprise-automation/durable-runtime";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
] as const;

export async function startDurableAutomationExecutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await startDurableAutomationExecution({
    tenantId: user.tenantId,
    ruleId: field(data, "ruleId"),
    actorUserId: user.id,
    payload: JSON.parse(
      field(data, "payload") || "{}",
    ) as Record<string, unknown>,
  });

  revalidatePath("/app/automation/runtime");
}

export async function signalDurableAutomationExecutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await signalDurableAutomationExecution({
    tenantId: user.tenantId,
    executionId: field(data, "executionId"),
    correlationNodeId: field(data, "nodeId"),
    signalType: field(data, "signalType") as
      | "APPROVAL"
      | "RESUME"
      | "CANCEL",
    payload: field(data, "decision")
      ? { decision: field(data, "decision") }
      : {},
    actorUserId: user.id,
  });

  revalidatePath("/app/automation/runtime");
}
