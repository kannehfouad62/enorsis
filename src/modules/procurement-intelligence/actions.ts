"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { publishProcurementIntelligenceMetrics } from "@/core/procurement-intelligence/service";

export async function refreshProcurementIntelligenceAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await publishProcurementIntelligenceMetrics({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/procurement-intelligence");
  revalidatePath("/app/executive");
  revalidatePath("/app/executive/kpis");
}
