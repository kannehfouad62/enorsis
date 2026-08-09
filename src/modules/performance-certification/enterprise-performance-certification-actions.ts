"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runEnterprisePerformanceCertification } from "@/core/performance-certification/enterprise-performance-certification";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PLATFORM_SUPER_ADMIN",
] as const;

export async function runEnterprisePerformanceCertificationAction() {
  const user =
    await requireAnyRole([...roles]);

  await runEnterprisePerformanceCertification({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/performance-certification",
  );
}
