"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runCrossDomainExecutiveInsightEngine } from "@/core/governed-executive-ai/correlated-service";

export async function runCrossDomainExecutiveInsightEngineAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await runCrossDomainExecutiveInsightEngine({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/ai-intelligence");
  revalidatePath("/app/executive");
}
