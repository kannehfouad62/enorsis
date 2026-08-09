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

export async function getCrossEngineGovernanceWorkspace() {
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

  const assessments =
    await prisma.crossEngineGovernanceAssessment.findMany({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
      take: 50,
    });

  const latest = assessments[0] ?? null;

  const conflicts = latest
    ? await prisma.crossEngineGovernanceConflict.findMany({
        where: {
          tenantId,
          assessmentId: latest.id,
        },
        orderBy: [
          { status: "asc" },
          { severity: "asc" },
          { createdAt: "desc" },
        ],
      })
    : [];

  return {
    assessments,
    latest,
    conflicts,
    metrics: {
      open: conflicts.filter(
        (item) => item.status === "OPEN",
      ).length,
      critical: conflicts.filter(
        (item) => item.severity === "CRITICAL",
      ).length,
      high: conflicts.filter(
        (item) => item.severity === "HIGH",
      ).length,
      resolved: conflicts.filter(
        (item) => item.status === "RESOLVED",
      ).length,
    },
  };
}
