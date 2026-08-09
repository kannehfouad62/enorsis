"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  generateCrossEngineGovernanceAssessment,
  resolveCrossEngineConflict,
} from "@/core/ai-governance/cross-engine-governance";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateCrossEngineGovernanceAssessmentAction() {
  const user = await requireAnyRole([...roles]);

  await generateCrossEngineGovernanceAssessment({
    tenantId: user.tenantId,
    userId: user.id,
  });

  revalidatePath(
    "/app/settings/platform-readiness/cross-engine-governance",
  );
}

export async function resolveCrossEngineConflictAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const note = field(data, "resolutionNote");

  if (!note) {
    throw new Error(
      "A governance resolution note is required.",
    );
  }

  await resolveCrossEngineConflict({
    tenantId: user.tenantId,
    userId: user.id,
    conflictId: field(data, "conflictId"),
    resolutionNote: note,
  });

  revalidatePath(
    "/app/settings/platform-readiness/cross-engine-governance",
  );
}
