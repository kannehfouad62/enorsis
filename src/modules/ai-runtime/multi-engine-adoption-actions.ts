"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  ensureAllMultiEngineAdoptions,
  updateMultiEngineRuntimeAdoption,
} from "@/core/ai-runtime/multi-engine-adoption";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (
  data: FormData,
  key: string,
) => String(data.get(key) ?? "").trim();

export async function initializeMultiEngineAdoptionAction() {
  const user =
    await requireAnyRole([...roles]);

  await ensureAllMultiEngineAdoptions(
    user.tenantId,
  );

  revalidatePath(
    "/app/settings/platform-readiness/ai-engine-adoption",
  );
}

export async function updateMultiEngineAdoptionAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...roles]);

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

  await updateMultiEngineRuntimeAdoption({
    tenantId: user.tenantId,
    userId: user.id,
    decisionPath:
      field(data, "decisionPath"),
    mode,
    rationale:
      field(data, "rationale") ||
      null,
  });

  revalidatePath(
    "/app/settings/platform-readiness/ai-engine-adoption",
  );
}
