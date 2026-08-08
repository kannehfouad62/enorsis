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

export async function getAutonomousRecommendationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [sets, approvedPlans] = await Promise.all([
    prisma.autonomousProcurementRecommendationSet.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.autonomousProcurementPlan.findMany({
      where: {
        tenantId,
        status: "APPROVED",
      },
      orderBy: { approvedAt: "desc" },
      take: 30,
    }),
  ]);

  const latestSet = sets[0] ?? null;

  const recommendations = latestSet
    ? await prisma.autonomousProcurementRecommendation.findMany({
        where: {
          tenantId,
          recommendationSetId: latestSet.id,
        },
        orderBy: [
          { priority: "asc" },
          { sequence: "asc" },
        ],
        take: 500,
      })
    : [];

  return {
    sets,
    approvedPlans,
    latestSet,
    recommendations,
    metrics: {
      sets: sets.length,
      proposed: recommendations.filter(
        (item) => item.status === "PROPOSED",
      ).length,
      accepted: recommendations.filter(
        (item) => item.status === "ACCEPTED",
      ).length,
      estimatedSavingsUsd:
        latestSet === null
          ? 0
          : Number(latestSet.estimatedSavingsUsd),
      estimatedExposureUsd:
        latestSet === null
          ? 0
          : Number(latestSet.estimatedExposureUsd),
    },
  };
}
