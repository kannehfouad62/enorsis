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

export async function getDigitalTwinWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [scenarios, runs] = await Promise.all([
    prisma.procurementDigitalTwinScenario.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.procurementDigitalTwinRun.findMany({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
      take: 50,
    }),
  ]);

  const latestRun = runs[0] ?? null;

  const impacts = latestRun
    ? await prisma.procurementDigitalTwinImpact.findMany({
        where: {
          tenantId,
          digitalTwinRunId: latestRun.id,
        },
        orderBy: [{ severity: "asc" }, { impactType: "asc" }],
      })
    : [];

  const latestScenario = latestRun
    ? scenarios.find(
        (scenario) => scenario.id === latestRun.scenarioId,
      ) ?? null
    : null;

  return {
    scenarios,
    runs,
    latestRun,
    latestScenario,
    impacts,
    metrics: {
      scenarioCount: scenarios.length,
      runCount: runs.length,
      highSeverityImpacts: impacts.filter((impact) =>
        ["HIGH", "CRITICAL"].includes(impact.severity),
      ).length,
      latestRisk: latestRun?.riskLevel ?? "—",
    },
  };
}
