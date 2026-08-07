"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  assignGovernedExecutiveInsightReviewer,
  decideGovernedExecutiveInsightApproval,
  escalateOverdueGovernedExecutiveApprovals,
} from "@/core/governed-executive-ai/approval-service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
] as const;

export async function assignGovernedExecutiveInsightReviewerAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const dueAtText = field(data, "dueAt");

  await assignGovernedExecutiveInsightReviewer({
    tenantId: user.tenantId,
    insightId: field(data, "insightId"),
    reviewerUserId: field(data, "reviewerUserId"),
    actorUserId: user.id,
    dueAt: dueAtText ? new Date(dueAtText) : null,
  });

  revalidatePath("/app/executive/ai-governance");
}

export async function decideGovernedExecutiveInsightApprovalAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await decideGovernedExecutiveInsightApproval({
    tenantId: user.tenantId,
    insightId: field(data, "insightId"),
    actorUserId: user.id,
    decision: field(data, "decision") as
      | "APPROVE"
      | "REJECT"
      | "REQUEST_CHANGES"
      | "ESCALATE",
    comment: field(data, "comment") || null,
  });

  revalidatePath("/app/executive/ai-governance");
  revalidatePath("/app/executive/ai-briefing");
}

export async function escalateOverdueGovernedExecutiveApprovalsAction() {
  const user = await requireAnyRole([...roles]);

  await escalateOverdueGovernedExecutiveApprovals({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/ai-governance");
}
