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

export async function getAutonomousEscalationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [escalations, runs] = await Promise.all([
    prisma.autonomousProcurementOrchestrationEscalation.findMany({
      where: { tenantId },
      orderBy: [
        { status: "asc" },
        { severity: "desc" },
        { lastDetectedAt: "desc" },
      ],
      take: 200,
    }),
    prisma.autonomousProcurementOrchestrationRun.findMany({
      where: {
        tenantId,
        status: {
          in: ["FAILED", "RETRY"],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    escalations,
    recoverableRuns: runs,
    metrics: {
      open: escalations.filter(
        (item) => item.status === "OPEN",
      ).length,
      acknowledged: escalations.filter(
        (item) => item.status === "ACKNOWLEDGED",
      ).length,
      critical: escalations.filter(
        (item) =>
          item.status !== "RESOLVED" &&
          item.severity === "CRITICAL",
      ).length,
      recoverable: runs.length,
    },
  };
}
