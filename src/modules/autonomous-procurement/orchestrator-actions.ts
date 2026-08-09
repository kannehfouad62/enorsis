"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  discoverReleasedAutonomousHandoffs,
  processAutonomousOrchestrationRun,
} from "@/core/autonomous-procurement/orchestrator";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function discoverAutonomousOrchestrationAction() {
  await requireAnyRole([...roles]);
  await discoverReleasedAutonomousHandoffs();
  revalidatePath("/app/automation/orchestrator");
}

export async function processAutonomousOrchestrationRunAction(
  data: FormData,
) {
  await requireAnyRole([...roles]);

  await processAutonomousOrchestrationRun(
    field(data, "runId"),
  );

  revalidatePath("/app/automation/orchestrator");
}
