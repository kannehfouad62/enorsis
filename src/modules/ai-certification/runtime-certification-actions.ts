"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runAiRuntimeCertification } from "@/core/ai-certification/runtime-certification";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
] as const;

export async function runAiRuntimeCertificationAction() {
  const user = await requireAnyRole([...roles]);

  await runAiRuntimeCertification({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/ai-runtime-certification",
  );
}
