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

export async function getNativeOutcomeReconciliationWorkspace() {
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

  const outcomes =
    await prisma.closedLoopProcurementOutcome.findMany({
      where: {
        tenantId,
        nativeReferenceId: {
          not: null,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

  const metrics =
    await prisma.closedLoopProcurementOutcomeMetric.findMany({
      where: {
        tenantId,
        outcomeId: {
          in: outcomes.map(
            (outcome) => outcome.id,
          ),
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    });

  const byOutcome = new Map<
    string,
    typeof metrics
  >();

  for (const metric of metrics) {
    const current =
      byOutcome.get(metric.outcomeId) ?? [];
    current.push(metric);
    byOutcome.set(
      metric.outcomeId,
      current,
    );
  }

  const automaticMetrics = metrics.filter(
    (metric) =>
      metric.observedByUserId === null &&
      metric.observedAt !== null,
  );

  return {
    outcomes,
    byOutcome,
    metrics: {
      outcomes: outcomes.length,
      automaticObservations:
        automaticMetrics.length,
      observed: metrics.filter(
        (metric) =>
          metric.status === "OBSERVED",
      ).length,
      validated: metrics.filter(
        (metric) =>
          metric.status === "VALIDATED",
      ).length,
    },
  };
}
