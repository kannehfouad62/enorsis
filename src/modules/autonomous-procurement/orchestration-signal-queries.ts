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

export async function getAutonomousSignalWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [signals, pausedRuns] = await Promise.all([
    prisma.autonomousProcurementOrchestrationSignal.findMany({
      where: { tenantId },
      orderBy: { receivedAt: "desc" },
      take: 200,
    }),
    prisma.autonomousProcurementOrchestrationRun.findMany({
      where: {
        tenantId,
        status: "PAUSED",
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    signals,
    pausedRuns,
    metrics: {
      received: signals.filter(
        (item) => item.status === "RECEIVED",
      ).length,
      processed: signals.filter(
        (item) => item.status === "PROCESSED",
      ).length,
      ignored: signals.filter(
        (item) => item.status === "IGNORED",
      ).length,
      failed: signals.filter(
        (item) => item.status === "FAILED",
      ).length,
      pausedRuns: pausedRuns.length,
    },
  };
}
