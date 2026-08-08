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

export async function getPredictiveCapacityWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const runs =
    await prisma.predictiveCapacityPlanningRun.findMany({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
      take: 20,
    });

  const latestRun = runs[0] ?? null;

  const signals = latestRun
    ? await prisma.predictiveCapacityPlanningSignal.findMany({
        where: {
          tenantId,
          capacityRunId: latestRun.id,
        },
        orderBy: [
          { projectedUtilizationPct: "desc" },
          { scopeLabel: "asc" },
        ],
      })
    : [];

  const locationSignals = signals.filter(
    (signal) => signal.scopeType === "LOCATION",
  );

  return {
    runs,
    latestRun,
    signals,
    locationSignals,
    enterprise:
      signals.find(
        (signal) => signal.scopeType === "ENTERPRISE",
      ) ?? null,
    metrics: {
      locations: locationSignals.length,
      highPressure: locationSignals.filter(
        (signal) =>
          ["HIGH", "CRITICAL"].includes(signal.riskLevel),
      ).length,
      projectedOverCapacity: locationSignals.filter(
        (signal) =>
          Number(signal.projectedUtilizationPct) >= 100,
      ).length,
      totalGapUnits: locationSignals.reduce(
        (sum, signal) =>
          sum + Number(signal.capacityGapUnits),
        0,
      ),
    },
  };
}
