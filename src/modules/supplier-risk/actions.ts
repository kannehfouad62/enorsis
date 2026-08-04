"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = ["RISK_COMPLIANCE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] as const;
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const score = (formData: FormData, key: string) => {
  const value = Number(text(formData, key));
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${key} must be between 0 and 100.`);
  }
  return value;
};

export async function createSupplierRiskAssessmentAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = text(formData, "supplierId");
  const values = {
    financialRisk: score(formData, "financialRisk"),
    operationalRisk: score(formData, "operationalRisk"),
    complianceRisk: score(formData, "complianceRisk"),
    cyberRisk: score(formData, "cyberRisk"),
    esgRisk: score(formData, "esgRisk"),
    deliveryRisk: score(formData, "deliveryRisk"),
    qualityRisk: score(formData, "qualityRisk"),
    concentrationRisk: score(formData, "concentrationRisk"),
  };
  const controlEffectiveness = score(formData, "controlEffectiveness");
  const inherentRiskScore = Math.round(Object.values(values).reduce((sum, value) => sum + value, 0) / 8);
  const residualRiskScore = Math.max(0, Math.round(inherentRiskScore * (1 - controlEffectiveness / 100)));
  const riskTier = residualRiskScore >= 75 ? "CRITICAL" : residualRiskScore >= 50 ? "HIGH" : residualRiskScore >= 25 ? "MODERATE" : "LOW";

  const supplier = await prisma.supplier.findFirstOrThrow({ where: { id: supplierId, tenantId: user.tenantId } });
  const assessment = await prisma.supplierRiskAssessment.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      ...values,
      inherentRiskScore,
      residualRiskScore,
      rationale: text(formData, "rationale"),
      controls: text(formData, "controls") || null,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.$transaction([
    prisma.supplier.update({ where: { id: supplier.id }, data: { riskTier } }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "supplier_risk.assess",
        resourceType: "SupplierRiskAssessment",
        resourceId: assessment.id,
        after: { supplierId, riskTier, residualRiskScore },
      },
    }),
  ]);

  revalidatePath(`/app/suppliers/${supplierId}/risk`);
  revalidatePath("/app/suppliers/risk");
}

export async function addSupplierRiskFindingAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = text(formData, "supplierId");
  await prisma.supplier.findFirstOrThrow({ where: { id: supplierId, tenantId: user.tenantId } });

  await prisma.supplierRiskFinding.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      type: text(formData, "type") as "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "SANCTIONS" | "CYBER" | "ESG" | "DELIVERY" | "QUALITY" | "CONCENTRATION" | "OTHER",
      title: text(formData, "title"),
      description: text(formData, "description"),
      severity: score(formData, "severity"),
      dueDate: text(formData, "dueDate") ? new Date(text(formData, "dueDate")) : null,
      ownerUserId: text(formData, "ownerUserId") || null,
      mitigationPlan: text(formData, "mitigationPlan") || null,
    },
  });

  revalidatePath(`/app/suppliers/${supplierId}/risk`);
  revalidatePath("/app/suppliers/risk");
}

export async function resolveSupplierRiskFindingAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const finding = await prisma.supplierRiskFinding.findFirstOrThrow({
    where: { id: text(formData, "findingId"), tenantId: user.tenantId },
  });

  await prisma.supplierRiskFinding.update({
    where: { id: finding.id },
    data: {
      status: "RESOLVED",
      mitigationPlan: text(formData, "mitigationPlan") || finding.mitigationPlan,
      resolvedAt: new Date(),
    },
  });

  revalidatePath(`/app/suppliers/${finding.supplierId}/risk`);
  revalidatePath("/app/suppliers/risk");
}

export async function createSupplierEsgAssessmentAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = text(formData, "supplierId");
  await prisma.supplier.findFirstOrThrow({ where: { id: supplierId, tenantId: user.tenantId } });

  const environmentalScore = score(formData, "environmentalScore");
  const socialScore = score(formData, "socialScore");
  const governanceScore = score(formData, "governanceScore");
  const overallScore = Math.round((environmentalScore + socialScore + governanceScore) / 3);
  const rating = overallScore >= 80 ? "LEADING" : overallScore >= 60 ? "ACCEPTABLE" : overallScore >= 40 ? "NEEDS_IMPROVEMENT" : "HIGH_RISK";

  await prisma.supplierEsgAssessment.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      environmentalScore,
      socialScore,
      governanceScore,
      overallScore,
      rating,
      carbonDisclosure: formData.get("carbonDisclosure") === "on",
      scienceBasedTargets: formData.get("scienceBasedTargets") === "on",
      modernSlaveryPolicy: formData.get("modernSlaveryPolicy") === "on",
      diversityProgram: formData.get("diversityProgram") === "on",
      ethicsPolicy: formData.get("ethicsPolicy") === "on",
      evidenceSummary: text(formData, "evidenceSummary") || null,
      assessedByUserId: user.id,
    },
  });

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { esgCommitted: rating === "LEADING" || rating === "ACCEPTABLE" },
  });

  revalidatePath(`/app/suppliers/${supplierId}/risk`);
  revalidatePath("/app/suppliers/risk");
}
