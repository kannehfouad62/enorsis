"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  acknowledgeAutonomousEscalation,
  recoverAutonomousOrchestrationRun,
  resolveAutonomousEscalation,
} from "@/core/autonomous-procurement/orchestration-sla";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function acknowledgeAutonomousEscalationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await acknowledgeAutonomousEscalation({
    tenantId: user.tenantId,
    userId: user.id,
    escalationId: field(data, "escalationId"),
  });

  revalidatePath(
    "/app/automation/orchestrator/escalations",
  );
}

export async function resolveAutonomousEscalationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await resolveAutonomousEscalation({
    tenantId: user.tenantId,
    userId: user.id,
    escalationId: field(data, "escalationId"),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/automation/orchestrator/escalations",
  );
}

export async function recoverAutonomousOrchestrationRunAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await recoverAutonomousOrchestrationRun({
    tenantId: user.tenantId,
    userId: user.id,
    runId: field(data, "runId"),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/automation/orchestrator/escalations",
  );
  revalidatePath("/app/automation/orchestrator");
}
