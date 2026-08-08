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

export async function getPredictiveProcurementWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const runs =
    await prisma.predictiveProcurementForecastRun.findMany({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
      take: 20,
    });

  const latestRun = runs[0] ?? null;

  const signals = latestRun
    ? await prisma.predictiveProcurementForecastSignal.findMany({
        where: {
          tenantId,
          forecastRunId: latestRun.id,
        },
        orderBy: [
          { riskLevel: "asc" },
          { changePercent: "desc" },
        ],
        take: 200,
      })
    : [];

  return {
    runs,
    latestRun,
    signals,
    metrics: {
      totalSignals: signals.length,
      critical: signals.filter(
        (item) => item.riskLevel === "CRITICAL",
      ).length,
      high: signals.filter(
        (item) => item.riskLevel === "HIGH",
      ).length,
      demand: signals.filter(
        (item) => item.signalType === "DEMAND_FORECAST",
      ).length,
      supplierRisk: signals.filter(
        (item) =>
          item.signalType === "SUPPLIER_RISK_FORECAST",
      ).length,
    },
  };
}
