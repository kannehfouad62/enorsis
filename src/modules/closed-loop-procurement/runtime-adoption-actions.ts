"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  ensurePredictiveProcurementAdoption,
  updateRuntimePolicyAdoption,
} from "@/core/closed-loop-procurement/runtime-adoption";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function initializeRuntimePolicyAdoptionAction() {
  const user = await requireAnyRole([...roles]);

  await ensurePredictiveProcurementAdoption(
    user.tenantId,
  );

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-adoption",
  );
}

export async function updateRuntimePolicyAdoptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const mode = field(data, "mode");

  if (
    mode !== "OFF" &&
    mode !== "SHADOW" &&
    mode !== "ENFORCED"
  ) {
    throw new Error(
      "Mode must be OFF, SHADOW or ENFORCED.",
    );
  }

  await updateRuntimePolicyAdoption({
    tenantId: user.tenantId,
    userId: user.id,
    decisionPath: field(
      data,
      "decisionPath",
    ),
    mode,
    rationale:
      field(data, "rationale") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/runtime-adoption",
  );
}
