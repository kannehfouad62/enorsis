"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  activateLearningPolicy,
  materializeApprovedLearningPolicies,
  rollbackLearningPolicy,
} from "@/core/closed-loop-procurement/learning-policies";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function materializeApprovedLearningPoliciesAction() {
  const user = await requireAnyRole([...roles]);

  await materializeApprovedLearningPolicies(
    user.tenantId,
  );

  revalidatePath(
    "/app/analytics/outcome-learning/policies",
  );
}

export async function activateLearningPolicyAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await activateLearningPolicy({
    tenantId: user.tenantId,
    userId: user.id,
    policyId: field(data, "policyId"),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/policies",
  );
}

export async function rollbackLearningPolicyAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await rollbackLearningPolicy({
    tenantId: user.tenantId,
    userId: user.id,
    policyId: field(data, "policyId"),
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/policies",
  );
}
