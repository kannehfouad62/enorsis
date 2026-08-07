"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { publishWarehouseIntelligenceMetrics } from "@/core/warehouse-intelligence/service";

export async function refreshWarehouseIntelligenceAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await publishWarehouseIntelligenceMetrics({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/warehouse-intelligence");
  revalidatePath("/app/executive");
  revalidatePath("/app/executive/kpis");
}
