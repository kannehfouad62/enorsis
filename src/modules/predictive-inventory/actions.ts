"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { generatePredictiveInventoryOptimization } from "@/core/predictive-inventory/optimization-engine";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

export async function generatePredictiveInventoryOptimizationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const horizonDays = Math.max(30, Math.min(365, Number(String(data.get("horizonDays") ?? "90"))));
  const result = await generatePredictiveInventoryOptimization({ tenantId: user.tenantId, createdByUserId: user.id, horizonDays });
  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Predictive inventory user",
      action: "predictive_inventory.optimization.generate",
      resourceType: "PredictiveInventoryOptimizationRun",
      resourceId: result.run.id,
      after: { horizonDays, signalCount: result.signalCount, modelVersion: result.run.modelVersion },
    },
  });
  revalidatePath("/app/analytics/predictive-inventory");
}
