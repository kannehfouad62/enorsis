import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getProcurementPlanningWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [plans, strategies, initiatives] = await Promise.all([
    prisma.procurementPlan.findMany({
      where: { tenantId },
      include: {
        categoryStrategies: true,
        savingsInitiatives: true,
      },
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
    }),
    prisma.categoryStrategy.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { category: "asc" }],
      take: 100,
    }),
    prisma.savingsInitiative.findMany({
      where: { tenantId },
      include: {
        milestones: { orderBy: { dueAt: "asc" } },
      },
      orderBy: [{ status: "asc" }, { targetRealizationAt: "asc" }],
      take: 200,
    }),
  ]);

  const totalTarget = initiatives.reduce(
    (sum, item) => sum + Number(item.targetSavings),
    0,
  );
  const validated = initiatives.reduce(
    (sum, item) => sum + Number(item.validatedSavings),
    0,
  );
  const realized = initiatives.reduce(
    (sum, item) => sum + Number(item.realizedSavings),
    0,
  );

  return {
    plans,
    strategies,
    initiatives,
    metrics: {
      activePlans: plans.filter((item) => item.status === "ACTIVE").length,
      activeStrategies: strategies.filter((item) => item.status === "ACTIVE")
        .length,
      pipelineCount: initiatives.filter((item) =>
        ["IDEA", "VALIDATED", "APPROVED", "IN_EXECUTION"].includes(item.status),
      ).length,
      totalTarget,
      validated,
      realized,
      realizationRate: totalTarget === 0 ? 0 : (realized / totalTarget) * 100,
    },
  };
}
