"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { calculateSupplierPerformance } from "./calculator";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function recalculateSupplierScorecardAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scorecardId = field(formData, "scorecardId");
  const scorecard = await prisma.supplierScorecard.findFirstOrThrow({
    where: {
      id: scorecardId,
      tenantId: user.tenantId,
      status: { in: ["DRAFT", "IN_REVIEW"] },
    },
  });

  const calculated = await calculateSupplierPerformance({
    tenantId: user.tenantId,
    supplierId: scorecard.supplierId,
    periodStart: scorecard.periodStart,
    periodEnd: scorecard.periodEnd,
  });

  const kpis = [
    ["delivery", "DELIVERY", "Delivery performance", 20, calculated.scores.deliveryScore],
    ["quality", "QUALITY", "Quality performance", 20, calculated.scores.qualityScore],
    ["cost", "COST", "Cost and invoice performance", 15, calculated.scores.costScore],
    ["service", "SERVICE", "Service performance", 10, calculated.scores.serviceScore],
    ["innovation", "INNOVATION", "Innovation performance", 10, calculated.scores.innovationScore],
    ["esg", "ESG", "ESG performance", 10, calculated.scores.esgScore],
    ["risk", "RISK", "Risk performance", 10, calculated.scores.riskScore],
    ["compliance", "COMPLIANCE", "Compliance performance", 5, calculated.scores.complianceScore],
  ] as const;

  await prisma.$transaction(async (tx) => {
    await tx.supplierScorecard.update({
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
        executiveSummary:
          `Evidence-backed recalculation completed ${new Date().toISOString()}.`,
      },
    });

    for (const [key, category, name, weight, score] of kpis) {
      await tx.supplierKpiResult.upsert({
        where: {
          scorecardId_key: {
            scorecardId: scorecard.id,
            key,
          },
        },
        update: {
          category,
          name,
          weight,
          actualValue: score,
          score,
          targetValue: 80,
          unit: "score",
          dataSource: "ENORSIS_OPERATIONAL_EVIDENCE",
          evidence: calculated.evidence,
        },
        create: {
          scorecardId: scorecard.id,
          key,
          category,
          name,
          weight,
          actualValue: score,
          score,
          targetValue: 80,
          unit: "score",
          dataSource: "ENORSIS_OPERATIONAL_EVIDENCE",
          evidence: calculated.evidence,
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "supplier_scorecard.recalculate",
        resourceType: "SupplierScorecard",
        resourceId: scorecard.id,
        after: {
          overallScore: calculated.scores.overallScore,
          rating: calculated.scores.rating,
          evidence: calculated.evidence,
        },
      },
    });
  });

  revalidatePath(`/app/suppliers/performance/${scorecard.id}`);
  revalidatePath("/app/suppliers/performance");
}

export async function recalculateAllDraftScorecardsAction() {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scorecards = await prisma.supplierScorecard.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ["DRAFT", "IN_REVIEW"] },
    },
    select: { id: true },
  });

  for (const scorecard of scorecards) {
    const formData = new FormData();
    formData.set("scorecardId", scorecard.id);
    await recalculateSupplierScorecardAction(formData);
  }
}
