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
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getAutonomousProcurementPlanningWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const plans =
    await prisma.autonomousProcurementPlan.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

  const latestPlan = plans[0] ?? null;

  const [actions, decisions] = latestPlan
    ? await Promise.all([
        prisma.autonomousProcurementPlanAction.findMany({
          where: {
            tenantId,
            planId: latestPlan.id,
          },
          orderBy: { sequence: "asc" },
          take: 500,
        }),
        prisma.autonomousProcurementPlanDecision.findMany({
          where: {
            tenantId,
            planId: latestPlan.id,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ])
    : [[], []];

  return {
    plans,
    latestPlan,
    actions,
    decisions,
    metrics: {
      totalPlans: plans.length,
      pendingApproval: plans.filter(
        (plan) => plan.status === "PENDING_APPROVAL",
      ).length,
      approved: plans.filter(
        (plan) => plan.status === "APPROVED",
      ).length,
      criticalActions: actions.filter(
        (action) => action.priority === "CRITICAL",
      ).length,
    },
  };
}
