"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runSecurityGovernanceCertification } from "@/core/security-certification/security-governance-certification";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "RISK_COMPLIANCE",
  "PLATFORM_SUPER_ADMIN",
] as const;

export async function runSecurityGovernanceCertificationAction() {
  const user =
    await requireAnyRole([...roles]);

  await runSecurityGovernanceCertification({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/security-certification",
  );
}
