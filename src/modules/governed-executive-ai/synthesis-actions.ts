"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runOpenAiExecutiveSynthesis } from "@/core/governed-executive-ai/openai-synthesis";

export async function runOpenAiExecutiveSynthesisAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await runOpenAiExecutiveSynthesis({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/ai-synthesis");
}
