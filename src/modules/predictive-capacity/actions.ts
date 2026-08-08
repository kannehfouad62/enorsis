"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { generatePredictiveCapacityPlan } from "@/core/predictive-capacity/capacity-engine";
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

export async function generatePredictiveCapacityPlanAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const horizonDays = Math.max(
    30,
    Math.min(
      365,
      Number(String(data.get("horizonDays") ?? "90")),
    ),
  );

  const targetHeadroomPct = Math.max(
    5,
    Math.min(
      50,
      Number(
        String(data.get("targetHeadroomPct") ?? "20"),
      ),
    ),
  );

  const result = await generatePredictiveCapacityPlan({
    tenantId: user.tenantId,
    createdByUserId: user.id,
    horizonDays,
    targetHeadroomPct,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Predictive capacity user",
      action: "predictive_capacity.plan.generate",
      resourceType: "PredictiveCapacityPlanningRun",
      resourceId: result.run.id,
      after: {
        horizonDays,
        targetHeadroomPct,
        signalCount: result.signalCount,
        modelVersion: result.run.modelVersion,
      },
    },
  });

  revalidatePath("/app/analytics/predictive-capacity");
}
