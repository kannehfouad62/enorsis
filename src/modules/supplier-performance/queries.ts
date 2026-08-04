import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierPerformanceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [suppliers, scorecards, plans, correctiveActions] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
    prisma.supplierScorecard.findMany({
      where: { tenantId },
      include: { supplier: true, kpis: true },
      orderBy: { periodEnd: "desc" },
      take: 100,
    }),
    prisma.supplierDevelopmentPlan.findMany({
      where: { tenantId },
      include: { supplier: true },
      orderBy: { targetCompletionAt: "asc" },
      take: 100,
    }),
    prisma.supplierCorrectiveAction.findMany({
      where: { tenantId },
      include: { supplier: true },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
    }),
  ]);

  const published = scorecards.filter((item) => item.status === "PUBLISHED");
  const averageScore =
    published.length === 0
      ? 0
      : Math.round(
          published.reduce((sum, item) => sum + Number(item.overallScore), 0) /
            published.length,
        );

  return {
    suppliers,
    scorecards,
    plans,
    correctiveActions,
    metrics: {
      publishedScorecards: published.length,
      averageScore,
      criticalSuppliers: published.filter((item) => item.rating === "CRITICAL").length,
      openScars: correctiveActions.filter((item) => item.status !== "CLOSED").length,
      overdueScars: correctiveActions.filter(
        (item) => item.status !== "CLOSED" && item.dueAt < new Date(),
      ).length,
      activePlans: plans.filter((item) => item.status === "ACTIVE").length,
    },
  };
}

export async function getSupplierScorecardDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const scorecard = await prisma.supplierScorecard.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      supplier: {
        include: {
          riskAssessments: { orderBy: { createdAt: "desc" }, take: 3 },
          riskFindings: { orderBy: { createdAt: "desc" }, take: 10 },
          esgAssessments: { orderBy: { assessedAt: "desc" }, take: 3 },
          purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      kpis: { orderBy: { category: "asc" } },
    },
  });

  if (!scorecard) redirect("/app/suppliers/performance");
  return { scorecard };
}
