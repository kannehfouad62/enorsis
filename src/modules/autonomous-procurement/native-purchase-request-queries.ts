import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getNativePurchaseRequestAdapterWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [drafts, recentPurchaseRequests] =
    await Promise.all([
      prisma.autonomousNativeWorkflowDraft.findMany({
        where: {
          tenantId,
          targetWorkflow: "PURCHASE_REQUEST",
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.purchaseRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        include: {
          lines: true,
        },
        take: 30,
      }),
    ]);

  return {
    eligibleDrafts: drafts.filter(
      (draft) =>
        !draft.nativeReferenceId &&
        [
          "DRAFT_MATERIALIZED",
          "NATIVE_WORKFLOW_OPENED",
        ].includes(draft.status),
    ),
    drafts,
    recentPurchaseRequests,
    metrics: {
      governedDrafts: drafts.length,
      eligible: drafts.filter(
        (draft) =>
          !draft.nativeReferenceId &&
          [
            "DRAFT_MATERIALIZED",
            "NATIVE_WORKFLOW_OPENED",
          ].includes(draft.status),
      ).length,
      nativeCreated: drafts.filter(
        (draft) =>
          draft.status === "NATIVE_RECORD_CREATED",
      ).length,
      draftPurchaseRequests:
        recentPurchaseRequests.filter(
          (request) => request.status === "DRAFT",
        ).length,
    },
  };
}
