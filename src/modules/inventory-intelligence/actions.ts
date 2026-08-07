"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { publishInventoryIntelligenceMetrics } from "@/core/inventory-intelligence/service";

export async function refreshInventoryIntelligenceAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await publishInventoryIntelligenceMetrics({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/inventory-intelligence");
  revalidatePath("/app/executive");
  revalidatePath("/app/executive/kpis");
}
