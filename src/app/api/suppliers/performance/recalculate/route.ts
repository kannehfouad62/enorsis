import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSupplierPerformance } from "@/modules/supplier-performance/calculator";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const scorecards = await prisma.supplierScorecard.findMany({
    where: {
      status: { in: ["DRAFT", "IN_REVIEW"] },
    },
    take: 100,
  });

  const results = [];

  for (const scorecard of scorecards) {
    try {
      const calculated = await calculateSupplierPerformance({
        tenantId: scorecard.tenantId,
        supplierId: scorecard.supplierId,
        periodStart: scorecard.periodStart,
        periodEnd: scorecard.periodEnd,
      });

      await prisma.supplierScorecard.update({
        where: { id: scorecard.id },
        data: {
          rating: calculated.scores.rating,
          overallScore: calculated.scores.overallScore,
          deliveryScore: calculated.scores.deliveryScore,
          qualityScore: calculated.scores.qualityScore,
          costScore: calculated.scores.costScore,
          serviceScore: calculated.scores.serviceScore,
          innovationScore: calculated.scores.innovationScore,
          esgScore: calculated.scores.esgScore,
          riskScore: calculated.scores.riskScore,
          complianceScore: calculated.scores.complianceScore,
        },
      });

      results.push({ id: scorecard.id, status: "UPDATED" });
    } catch (error) {
      results.push({
        id: scorecard.id,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    selected: scorecards.length,
    results,
  });
}
