import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureRuntimeRollbackRule,
  evaluateRuntimeRollbackReadiness,
} from "@/core/closed-loop-procurement/runtime-promotion";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getRuntimePromotionWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      roles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  await ensureRuntimeRollbackRule(
    tenantId,
  );

  const [assessments, rollback] =
    await Promise.all([
      prisma.closedLoopRuntimePromotionAssessment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      evaluateRuntimeRollbackReadiness(
        tenantId,
      ),
    ]);

  return {
    assessments,
    rollback,
    metrics: {
      draft: assessments.filter(
        (item) => item.status === "DRAFT",
      ).length,
      eligible: assessments.filter(
        (item) =>
          item.status === "DRAFT" &&
          item.eligible,
      ).length,
      promoted: assessments.filter(
        (item) =>
          item.status === "PROMOTED",
      ).length,
      rollbackRecommended:
        rollback.rollbackRecommended,
    },
  };
}
