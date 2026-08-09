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

export async function getClosedLoopOutcomeWorkspace() {
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

  const [outcomes, metrics] = await Promise.all([
    prisma.closedLoopProcurementOutcome.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.closedLoopProcurementOutcomeMetric.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const byOutcome = new Map<
    string,
    typeof metrics
  >();

  for (const metric of metrics) {
    const current =
      byOutcome.get(metric.outcomeId) ?? [];
    current.push(metric);
    byOutcome.set(metric.outcomeId, current);
  }

  const observed = metrics.filter(
    (item) =>
      item.actualValue !== null &&
      item.predictedValue !== null,
  );

  const absVariancePercent = observed
    .map((item) =>
      item.variancePercent === null
        ? null
        : Math.abs(item.variancePercent),
    )
    .filter(
      (value): value is number => value !== null,
    );

  const meanAbsoluteVariance =
    absVariancePercent.length === 0
      ? 0
      : absVariancePercent.reduce(
          (sum, value) => sum + value,
          0,
        ) / absVariancePercent.length;

  return {
    outcomes,
    byOutcome,
    metrics: {
      totalOutcomes: outcomes.length,
      open: outcomes.filter(
        (item) => item.status === "OPEN",
      ).length,
      observed: outcomes.filter(
        (item) => item.status === "OBSERVED",
      ).length,
      validated: outcomes.filter(
        (item) => item.status === "VALIDATED",
      ).length,
      rejected: outcomes.filter(
        (item) => item.status === "REJECTED",
      ).length,
      observedMetrics: observed.length,
      meanAbsoluteVariance,
    },
  };
}
