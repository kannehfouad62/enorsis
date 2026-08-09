"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { captureAiRuntimeHealthSnapshot } from "@/core/ai-monitoring/runtime-health";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

export async function captureAiRuntimeHealthSnapshotAction() {
  const user = await requireAnyRole([...roles]);

  await captureAiRuntimeHealthSnapshot(
    user.tenantId,
  );

  revalidatePath(
    "/app/settings/platform-readiness/ai-runtime-health",
  );
}
