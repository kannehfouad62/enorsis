"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const number = (formData: FormData, key: string) =>
  Number(field(formData, key) || 0);

function ratingFor(score: number) {
  if (score >= 90) return "EXCEPTIONAL" as const;
  if (score >= 80) return "STRONG" as const;
  if (score >= 70) return "ACCEPTABLE" as const;
  if (score >= 55) return "NEEDS_IMPROVEMENT" as const;
  return "CRITICAL" as const;
}

export async function createSupplierScorecardAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scores = {
    delivery: number(formData, "deliveryScore"),
    quality: number(formData, "qualityScore"),
    cost: number(formData, "costScore"),
    service: number(formData, "serviceScore"),
    innovation: number(formData, "innovationScore"),
    esg: number(formData, "esgScore"),
    risk: number(formData, "riskScore"),
    compliance: number(formData, "complianceScore"),
  };

  const overallScore =
    scores.delivery * 0.2 +
    scores.quality * 0.2 +
    scores.cost * 0.15 +
    scores.service * 0.1 +
    scores.innovation * 0.1 +
    scores.esg * 0.1 +
    scores.risk * 0.1 +
    scores.compliance * 0.05;

  const supplierId = field(formData, "supplierId");
  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  const scorecard = await prisma.supplierScorecard.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      periodStart: new Date(field(formData, "periodStart")),
      periodEnd: new Date(field(formData, "periodEnd")),
      rating: ratingFor(overallScore),
      overallScore,
      deliveryScore: scores.delivery,
      qualityScore: scores.quality,
      costScore: scores.cost,
      serviceScore: scores.service,
      innovationScore: scores.innovation,
      esgScore: scores.esg,
      riskScore: scores.risk,
      complianceScore: scores.compliance,
      executiveSummary: field(formData, "executiveSummary") || null,
      strengths: field(formData, "strengths") || null,
      concerns: field(formData, "concerns") || null,
      createdByUserId: user.id,
      kpis: {
        create: [
          ["DELIVERY", "delivery", "Delivery performance", scores.delivery, 20],
          ["QUALITY", "quality", "Quality performance", scores.quality, 20],
          ["COST", "cost", "Cost performance", scores.cost, 15],
          ["SERVICE", "service", "Service performance", scores.service, 10],
          ["INNOVATION", "innovation", "Innovation performance", scores.innovation, 10],
          ["ESG", "esg", "ESG performance", scores.esg, 10],
          ["RISK", "risk", "Risk performance", scores.risk, 10],
          ["COMPLIANCE", "compliance", "Compliance performance", scores.compliance, 5],
        ].map(([category, key, name, score, weight]) => ({
          category: category as
            | "DELIVERY"
            | "QUALITY"
            | "COST"
            | "SERVICE"
            | "INNOVATION"
            | "ESG"
            | "RISK"
            | "COMPLIANCE",
          key: String(key),
          name: String(name),
          weight: Number(weight),
          score: Number(score),
          actualValue: Number(score),
          targetValue: 80,
          unit: "score",
          dataSource: "MANUAL_ASSESSMENT",
        })),
      },
    },
  });

  revalidatePath("/app/suppliers/performance");
  revalidatePath(`/app/suppliers/performance/${scorecard.id}`);
}

export async function submitSupplierScorecardAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scorecardId = field(formData, "scorecardId");
  const scorecard = await prisma.supplierScorecard.findFirstOrThrow({
    where: { id: scorecardId, tenantId: user.tenantId, status: "DRAFT" },
  });

  await prisma.supplierScorecard.update({
    where: { id: scorecard.id },
    data: { status: "IN_REVIEW", reviewedByUserId: user.id, reviewedAt: new Date() },
  });

  revalidatePath(`/app/suppliers/performance/${scorecard.id}`);
}

export async function publishSupplierScorecardAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scorecardId = field(formData, "scorecardId");
  const scorecard = await prisma.supplierScorecard.findFirstOrThrow({
    where: { id: scorecardId, tenantId: user.tenantId, status: "IN_REVIEW" },
  });

  await prisma.supplierScorecard.update({
    where: { id: scorecard.id },
    data: { status: "PUBLISHED", publishedByUserId: user.id, publishedAt: new Date() },
  });

  revalidatePath(`/app/suppliers/performance/${scorecard.id}`);
  revalidatePath("/app/suppliers/performance");
}

export async function createSupplierDevelopmentPlanAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const supplierId = field(formData, "supplierId");
  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  await prisma.supplierDevelopmentPlan.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title: field(formData, "title"),
      objective: field(formData, "objective"),
      ownerUserId: user.id,
      supplierOwnerName: field(formData, "supplierOwnerName") || null,
      startsAt: new Date(field(formData, "startsAt")),
      targetCompletionAt: new Date(field(formData, "targetCompletionAt")),
      successMeasures: field(formData, "successMeasures"),
      actions: field(formData, "actions")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      reviewCadence: field(formData, "reviewCadence") || null,
      status: "ACTIVE",
    },
  });

  revalidatePath("/app/suppliers/performance");
}

export async function createSupplierCorrectiveActionAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const supplierId = field(formData, "supplierId");
  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  const count = await prisma.supplierCorrectiveAction.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.supplierCorrectiveAction.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      scarNumber: `SCAR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: field(formData, "title"),
      description: field(formData, "description"),
      severity: field(formData, "severity") as "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
      status: "SUPPLIER_RESPONSE_REQUIRED",
      sourceType: field(formData, "sourceType") || null,
      sourceId: field(formData, "sourceId") || null,
      ownerUserId: user.id,
      supplierContactName: field(formData, "supplierContactName") || null,
      supplierContactEmail: field(formData, "supplierContactEmail") || null,
      containmentAction: field(formData, "containmentAction") || null,
      dueAt: new Date(field(formData, "dueAt")),
    },
  });

  revalidatePath("/app/suppliers/performance");
}

export async function updateSupplierCorrectiveActionAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const scarId = field(formData, "scarId");
  const scar = await prisma.supplierCorrectiveAction.findFirstOrThrow({
    where: { id: scarId, tenantId: user.tenantId },
  });

  await prisma.supplierCorrectiveAction.update({
    where: { id: scar.id },
    data: {
      status: field(formData, "status") as
        | "OPEN"
        | "SUPPLIER_RESPONSE_REQUIRED"
        | "UNDER_REVIEW"
        | "IMPLEMENTATION"
        | "VERIFICATION"
        | "CLOSED"
        | "REJECTED",
      rootCause: field(formData, "rootCause") || scar.rootCause,
      correctiveActionPlan:
        field(formData, "correctiveActionPlan") || scar.correctiveActionPlan,
      preventiveAction:
        field(formData, "preventiveAction") || scar.preventiveAction,
      verificationNotes:
        field(formData, "verificationNotes") || scar.verificationNotes,
      verifiedByUserId:
        field(formData, "status") === "CLOSED" ? user.id : scar.verifiedByUserId,
      verifiedAt:
        field(formData, "status") === "CLOSED" ? new Date() : scar.verifiedAt,
      closedAt:
        field(formData, "status") === "CLOSED" ? new Date() : scar.closedAt,
    },
  });

  revalidatePath("/app/suppliers/performance");
}
