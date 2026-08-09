"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  evaluateRuntimeRollbackReadiness,
  generateRuntimePromotionAssessment,
  promoteRuntimeAdoption,
  rejectRuntimePromotion,
} from "@/core/closed-loop-procurement/runtime-promotion";
import { updateRuntimePolicyAdoption } from "@/core/closed-loop-procurement/runtime-adoption";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateRuntimePromotionAssessmentAction() {
  const user = await requireAnyRole([...roles]);

  await generateRuntimePromotionAssessment(
    user.tenantId,
  );

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-promotion",
  );
}

export async function promoteRuntimeAdoptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await promoteRuntimeAdoption({
    tenantId: user.tenantId,
    userId: user.id,
    assessmentId: field(
      data,
      "assessmentId",
    ),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-promotion",
  );
  revalidatePath(
    "/app/analytics/outcome-learning/runtime-adoption",
  );
}

export async function rejectRuntimePromotionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await rejectRuntimePromotion({
    tenantId: user.tenantId,
    userId: user.id,
    assessmentId: field(
      data,
      "assessmentId",
    ),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-promotion",
  );
}

export async function rollbackRuntimeAdoptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const readiness =
    await evaluateRuntimeRollbackReadiness(
      user.tenantId,
    );

  if (
    readiness.adoption.mode !==
    "ENFORCED"
  ) {
    throw new Error(
      "Only ENFORCED runtime adoption can be rolled back.",
    );
  }

  await updateRuntimePolicyAdoption({
    tenantId: user.tenantId,
    userId: user.id,
    decisionPath:
      readiness.adoption.decisionPath,
    mode: "SHADOW",
    rationale:
      field(data, "note") ||
      "Governed rollback from ENFORCED to SHADOW.",
  });

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-promotion",
  );
  revalidatePath(
    "/app/analytics/outcome-learning/runtime-adoption",
  );
}
