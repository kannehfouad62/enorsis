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

export async function getNativeInventoryRebalancingAdapterWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [drafts, recentMovements] =
    await Promise.all([
      prisma.autonomousNativeWorkflowDraft.findMany({
        where: {
          tenantId,
          targetWorkflow: "INVENTORY_REBALANCE",
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.inventoryMovementLedger.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  const eligibleDrafts = drafts.filter(
    (draft) =>
      !draft.nativeReferenceId &&
      [
        "DRAFT_MATERIALIZED",
        "NATIVE_WORKFLOW_OPENED",
      ].includes(draft.status),
  );

  return {
    eligibleDrafts,
    drafts,
    recentMovements,
    metrics: {
      governedDrafts: drafts.length,
      eligible: eligibleDrafts.length,
      nativeCreated: drafts.filter(
        (draft) =>
          draft.status === "NATIVE_RECORD_CREATED",
      ).length,
      draftTransfers: recentMovements.filter(
        (movement) =>
          movement.status === "DRAFT" &&
          movement.movementType === "TRANSFER",
      ).length,
    },
  };
}
