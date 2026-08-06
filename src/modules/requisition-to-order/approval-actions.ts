"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createApprovalRoute, decideApproval } from "@/core/requisition-to-order/approval";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function createApprovalRouteAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER", "BUYER", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT",
  ]);
  const approvers = field(data, "approverUserIds")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await createApprovalRoute({
    journeyId: field(data, "journeyId"),
    assessmentId: field(data, "assessmentId") || null,
    name: field(data, "name") || "Standard requisition approval",
    amount: field(data, "amount") ? Number(field(data, "amount")) : null,
    currencyCode: field(data, "currencyCode") || "USD",
    initiatedByUserId: user.id,
    steps: [{
      name: field(data, "stepName") || "Manager approval",
      mode: field(data, "mode") as "SEQUENTIAL" | "PARALLEL",
      requiredApprovals: Number(field(data, "requiredApprovals") || 1),
      approverUserIds: approvers,
      dueAt: field(data, "dueAt") ? new Date(field(data, "dueAt")) : null,
    }],
  });
  revalidatePath("/app/requisition-to-order");
}

export async function decideApprovalAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER", "TENANT_ADMIN", "APPROVER", "PROCUREMENT_MANAGER",
    "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT",
  ]);
  await decideApproval({
    decisionId: field(data, "decisionId"),
    actorUserId: user.id,
    action: field(data, "action") as "APPROVED" | "REJECTED",
    comments: field(data, "comments") || null,
  });
  revalidatePath("/app/requisition-to-order");
}
