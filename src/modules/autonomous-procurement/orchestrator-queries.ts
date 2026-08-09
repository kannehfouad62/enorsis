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

export async function getAutonomousOrchestratorWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const runs =
    await prisma.autonomousProcurementOrchestrationRun.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

  const latestIds = runs.slice(0, 25).map((run) => run.id);

  const events =
    latestIds.length === 0
      ? []
      : await prisma.autonomousProcurementOrchestrationEvent.findMany({
          where: {
            tenantId,
            orchestrationRunId: {
              in: latestIds,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

  return {
    runs,
    events,
    metrics: {
      total: runs.length,
      running: runs.filter(
        (run) =>
          ["READY", "RUNNING", "RETRY"].includes(
            run.status,
          ),
      ).length,
      paused: runs.filter(
        (run) => run.status === "PAUSED",
      ).length,
      completed: runs.filter(
        (run) => run.status === "COMPLETED",
      ).length,
      failed: runs.filter(
        (run) => run.status === "FAILED",
      ).length,
    },
  };
}
