"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { recoverDurableAutomationExecution } from "@/core/enterprise-automation/durable-recovery";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
] as const;

export async function recoverDurableAutomationExecutionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await recoverDurableAutomationExecution({
    tenantId: user.tenantId,
    executionId: field(data, "executionId"),
    actorUserId: user.id,
    nodeId: field(data, "nodeId") || null,
  });

  revalidatePath("/app/automation/runtime");
}
