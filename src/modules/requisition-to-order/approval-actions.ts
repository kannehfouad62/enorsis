"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "APPROVER",
    "PROCUREMENT_MANAGER",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const decisionId = field(data, "decisionId");
  const action = field(data, "action") as
    | "APPROVED"
    | "REJECTED";

  try {
    const result = await decideApproval({
      decisionId,
      actorUserId: user.id,
      action,
      comments: field(data, "comments") || null,
    });

    revalidatePath("/app/requisition-to-order");

    const message =
      result.status === "APPROVED"
        ? "Approval completed successfully."
        : result.status === "REJECTED"
          ? "Approval was rejected."
          : result.status === "NEXT_STEP"
            ? "Approval recorded. The workflow moved to the next step."
            : "Approval recorded. Additional approvals are still required.";

    redirect(
      `/app/requisition-to-order?approvalMessage=${encodeURIComponent(
        message,
      )}`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "The approval decision could not be completed.";

    console.error("Requisition approval decision failed", {
      decisionId,
      actorUserId: user.id,
      action,
      error,
    });

    redirect(
      `/app/requisition-to-order?approvalError=${encodeURIComponent(
        message,
      )}`,
    );
  }
}
