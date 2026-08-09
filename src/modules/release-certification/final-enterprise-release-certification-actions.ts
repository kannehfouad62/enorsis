"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runFinalEnterpriseReleaseCertification } from "@/core/release-certification/final-enterprise-release-certification";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PLATFORM_SUPER_ADMIN",
] as const;

export async function runFinalEnterpriseReleaseCertificationAction() {
  const user = await requireAnyRole([...roles]);

  await runFinalEnterpriseReleaseCertification({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/final-release-certification",
  );
}
