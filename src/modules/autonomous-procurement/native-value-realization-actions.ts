"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createNativeValueRealizationDraft } from "@/core/autonomous-procurement/native-value-realization-adapter";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNativeValueRealizationDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const initiative =
    await createNativeValueRealizationDraft({
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
        user.email ?? "Autonomous value operator",
      action:
        "autonomous_execution.native_value_realization.create_qualifying",
      resourceType: "ProcurementValueInitiative",
      resourceId: initiative.id,
      after: {
        initiativeNumber:
          initiative.initiativeNumber,
        status: initiative.status,
        targetBenefitAmount: Number(
          initiative.targetBenefitAmount,
        ),
        realizedBenefitAmount: Number(
          initiative.realizedBenefitAmount,
        ),
        autonomousFinanceValidationPerformed: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts/value-realization",
  );
  revalidatePath("/app/value-realization");
}
