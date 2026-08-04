import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplyResilienceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [events, plans] = await Promise.all([
    prisma.supplyRiskEvent.findMany({
      where: { tenantId },
      include: { exposures: true, resiliencePlans: true },
      orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
      take: 100,
    }),
    prisma.resiliencePlan.findMany({
      where: { tenantId },
      include: { event: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  return {
    events,
    plans,
    metrics: {
      openEvents: events.filter((item) =>
        ["OPEN", "MONITORING", "CONTAINED", "RECOVERING"].includes(item.status),
      ).length,
      criticalEvents: events.filter(
        (item) => item.severity === "CRITICAL" && item.status !== "CLOSED",
      ).length,
      spendAtRisk: events.reduce(
        (sum, item) =>
          sum + item.exposures.reduce(
            (inner, exposure) => inner + Number(exposure.spendAtRisk ?? 0),
            0,
          ),
        0,
      ),
      activePlans: plans.filter((item) =>
        ["ACTIVE", "ACTIVATED"].includes(item.status),
      ).length,
      singleSourceExposures: events.reduce(
        (sum, item) =>
          sum + item.exposures.filter(
            (exposure) => exposure.alternateSourceCount === 0,
          ).length,
        0,
      ),
    },
  };
}
