import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getDemandPlanningWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [plans, items, recommendations] = await Promise.all([
    prisma.demandPlan.findMany({
      where: { tenantId },
      include: {
        forecasts: { include: { inventoryItem: true } },
        recommendations: true,
      },
      orderBy: [{ status: "asc" }, { periodEnd: "desc" }],
      take: 100,
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { balances: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.replenishmentRecommendation.findMany({
      where: { tenantId },
      include: { inventoryItem: true, plan: true },
      orderBy: [{ status: "asc" }, { recommendedOrderDate: "asc" }],
      take: 200,
    }),
  ]);

  return {
    plans,
    items,
    recommendations,
    metrics: {
      activePlans: plans.filter((item) => item.status === "ACTIVE").length,
      forecastItems: plans.reduce(
        (sum, item) => sum + item.forecasts.length,
        0,
      ),
      proposed: recommendations.filter((item) => item.status === "PROPOSED")
        .length,
      approved: recommendations.filter((item) => item.status === "APPROVED")
        .length,
      plannedValue: recommendations.reduce(
        (sum, item) => sum + Number(item.estimatedTotalCost ?? 0),
        0,
      ),
      stockoutRisks: recommendations.filter(
        (item) =>
          Number(item.recommendedQuantity) > 0 &&
          Number(item.currentAvailable) <= 0,
      ).length,
    },
  };
}
