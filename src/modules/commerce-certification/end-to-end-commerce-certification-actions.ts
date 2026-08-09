"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runEndToEndCommerceCertification } from "@/core/commerce-certification/end-to-end-commerce-certification";

const roles = [
  "PLATFORM_SUPER_ADMIN",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
] as const;

export async function runEndToEndCommerceCertificationAction() {
  const user = await requireAnyRole([...roles]);

  await runEndToEndCommerceCertification({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/end-to-end-commerce",
  );
}
