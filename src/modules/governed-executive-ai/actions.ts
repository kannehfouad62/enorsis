"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  acknowledgeGovernedExecutiveInsight,
  dismissGovernedExecutiveInsight,
  recordGovernedExecutiveInsightFeedback,
  runGovernedExecutiveInsightEngine,
} from "@/core/governed-executive-ai/service";

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

export async function runGovernedExecutiveInsightEngineAction() {
  const user = await requireAnyRole([...roles]);

  await runGovernedExecutiveInsightEngine({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/ai-intelligence");
}

export async function acknowledgeGovernedExecutiveInsightAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await acknowledgeGovernedExecutiveInsight({
    tenantId: user.tenantId,
    insightId: field(data, "insightId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/ai-intelligence");
}

export async function dismissGovernedExecutiveInsightAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await dismissGovernedExecutiveInsight({
    tenantId: user.tenantId,
    insightId: field(data, "insightId"),
    actorUserId: user.id,
    reason: field(data, "reason"),
  });

  revalidatePath("/app/executive/ai-intelligence");
}

export async function recordGovernedExecutiveInsightFeedbackAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await recordGovernedExecutiveInsightFeedback({
    tenantId: user.tenantId,
    insightId: field(data, "insightId"),
    userId: user.id,
    feedbackType: field(data, "feedbackType") as
      | "USEFUL"
      | "NOT_USEFUL"
      | "INCORRECT"
      | "NEEDS_CONTEXT",
    comment: field(data, "comment") || null,
  });

  revalidatePath("/app/executive/ai-intelligence");
}
