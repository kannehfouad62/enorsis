"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createNativeRiskResilienceDraft } from "@/core/autonomous-procurement/native-risk-resilience-adapter";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNativeRiskResilienceDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const plan = await createNativeRiskResilienceDraft({
    tenantId: user.tenantId,
    userId: user.id,
    nativeDraftId: field(data, "nativeDraftId"),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Autonomous resilience operator",
      action:
        "autonomous_execution.native_resilience.create_draft",
      resourceType: "ResiliencePlan",
      resourceId: plan.id,
      after: {
        status: plan.status,
        autonomousActivationPerformed: false,
        autonomousClosurePerformed: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts/resilience",
  );
  revalidatePath("/app/resilience");
}
