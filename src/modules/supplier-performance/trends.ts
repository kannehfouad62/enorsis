import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierPerformanceTrends() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const scorecards = await prisma.supplierScorecard.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "PUBLISHED",
    },
    include: { supplier: true },
    orderBy: [{ supplierId: "asc" }, { periodEnd: "asc" }],
  });

  const groups = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      points: Array<{
        periodEnd: Date;
        overallScore: number;
        rating: string;
      }>;
    }
  >();

  for (const scorecard of scorecards) {
    const item = groups.get(scorecard.supplierId) ?? {
      supplierId: scorecard.supplierId,
      supplierName:
        scorecard.supplier.tradingName ?? scorecard.supplier.legalName,
      points: [],
    };

    item.points.push({
      periodEnd: scorecard.periodEnd,
      overallScore: Number(scorecard.overallScore),
      rating: scorecard.rating,
    });

    groups.set(scorecard.supplierId, item);
  }

  const suppliers = [...groups.values()].map((supplier) => {
    const latest = supplier.points.at(-1);
    const previous = supplier.points.at(-2);
    const change =
      latest && previous ? latest.overallScore - previous.overallScore : 0;

    return {
      ...supplier,
      latestScore: latest?.overallScore ?? 0,
      latestRating: latest?.rating ?? "NOT_RATED",
      change,
      trend:
        change > 2 ? "IMPROVING" : change < -2 ? "DECLINING" : "STABLE",
    };
  });

  return {
    suppliers: suppliers.sort((a, b) => a.latestScore - b.latestScore),
    metrics: {
      improving: suppliers.filter((item) => item.trend === "IMPROVING").length,
      declining: suppliers.filter((item) => item.trend === "DECLINING").length,
      stable: suppliers.filter((item) => item.trend === "STABLE").length,
      critical: suppliers.filter((item) => item.latestRating === "CRITICAL")
        .length,
    },
  };
}
