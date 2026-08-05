"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createSupplierEsgProfileAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await prisma.supplierEsgProfile.create({
    data: {
      tenantId: user.tenantId,
      supplierId: field(data, "supplierId"),
      status: "ASSESSMENT_DUE",
      riskLevel: field(data, "riskLevel") as
        | "LOW"
        | "MODERATE"
        | "HIGH"
        | "CRITICAL",
      scope1Emissions: field(data, "scope1Emissions")
        ? Number(field(data, "scope1Emissions"))
        : null,
      scope2Emissions: field(data, "scope2Emissions")
        ? Number(field(data, "scope2Emissions"))
        : null,
      scope3Emissions: field(data, "scope3Emissions")
        ? Number(field(data, "scope3Emissions"))
        : null,
      emissionsUnit: field(data, "emissionsUnit") || "tCO2e",
      renewableEnergyPercent: field(data, "renewableEnergyPercent")
        ? Number(field(data, "renewableEnergyPercent"))
        : null,
      wasteDiversionPercent: field(data, "wasteDiversionPercent")
        ? Number(field(data, "wasteDiversionPercent"))
        : null,
      waterUse: field(data, "waterUse")
        ? Number(field(data, "waterUse"))
        : null,
      humanRightsPolicy: data.get("humanRightsPolicy") === "on",
      modernSlaveryStatement:
        data.get("modernSlaveryStatement") === "on",
      conflictMineralsDeclaration:
        data.get("conflictMineralsDeclaration") === "on",
      codeOfConductAccepted:
        data.get("codeOfConductAccepted") === "on",
      diversityClassification: field(
        data,
        "diversityClassification",
      ) as
        | "NONE"
        | "MINORITY_OWNED"
        | "WOMEN_OWNED"
        | "VETERAN_OWNED"
        | "DISABILITY_OWNED"
        | "LGBTQ_OWNED"
        | "SMALL_BUSINESS"
        | "LOCAL_BUSINESS"
        | "SOCIAL_ENTERPRISE"
        | "OTHER",
      diversityCertificationId:
        field(data, "diversityCertificationId") || null,
      certificationExpiresAt: field(data, "certificationExpiresAt")
        ? new Date(field(data, "certificationExpiresAt"))
        : null,
      ownerUserId: user.id,
    },
  });

  revalidatePath("/app/sustainability");
}

export async function createResponsibleSourcingAssessmentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierEsgProfileId = field(data, "supplierEsgProfileId");

  const profile = await prisma.supplierEsgProfile.findFirstOrThrow({
    where: {
      id: supplierEsgProfileId,
      tenantId: user.tenantId,
    },
  });

  const environmentalScore = Number(
    field(data, "environmentalScore"),
  );
  const socialScore = Number(field(data, "socialScore"));
  const governanceScore = Number(field(data, "governanceScore"));
  const overallScore =
    (environmentalScore + socialScore + governanceScore) / 3;

  await prisma.$transaction([
    prisma.responsibleSourcingAssessment.create({
      data: {
        supplierEsgProfileId,
        assessmentPeriod: field(data, "assessmentPeriod"),
        status: "APPROVED",
        environmentalScore,
        socialScore,
        governanceScore,
        findings: field(data, "findings") || null,
        assessedByUserId: user.id,
        submittedAt: new Date(),
        approvedByUserId: user.id,
        approvedAt: new Date(),
        expiresAt: field(data, "expiresAt")
          ? new Date(field(data, "expiresAt"))
          : null,
      },
    }),
    prisma.supplierEsgProfile.update({
      where: { id: profile.id },
      data: {
        status:
          overallScore < 60
            ? "IMPROVEMENT_REQUIRED"
            : "ASSESSED",
        environmentalScore,
        socialScore,
        governanceScore,
        overallScore,
        lastAssessedAt: new Date(),
        nextAssessmentDueAt: field(data, "expiresAt")
          ? new Date(field(data, "expiresAt"))
          : null,
      },
    }),
  ]);

  revalidatePath("/app/sustainability");
}

export async function createSustainabilityImprovementAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierEsgProfileId = field(data, "supplierEsgProfileId");

  await prisma.supplierEsgProfile.findFirstOrThrow({
    where: {
      id: supplierEsgProfileId,
      tenantId: user.tenantId,
    },
  });

  await prisma.sustainabilityImprovementPlan.create({
    data: {
      supplierEsgProfileId,
      title: field(data, "title"),
      description: field(data, "description"),
      category: field(data, "category"),
      targetMetric: field(data, "targetMetric") || null,
      baselineValue: field(data, "baselineValue")
        ? Number(field(data, "baselineValue"))
        : null,
      targetValue: field(data, "targetValue")
        ? Number(field(data, "targetValue"))
        : null,
      dueAt: new Date(field(data, "dueAt")),
      ownerUserId: field(data, "ownerUserId") || user.id,
      supplierOwnerName:
        field(data, "supplierOwnerName") || null,
    },
  });

  revalidatePath("/app/sustainability");
}

export async function updateSustainabilityImprovementAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const id = field(data, "improvementId");

  const improvement =
    await prisma.sustainabilityImprovementPlan.findFirstOrThrow({
      where: {
        id,
        profile: { tenantId: user.tenantId },
      },
    });

  const status = field(data, "status") as
    | "OPEN"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "COMPLETED"
    | "CANCELLED";

  await prisma.sustainabilityImprovementPlan.update({
    where: { id: improvement.id },
    data: {
      status,
      blocker: field(data, "blocker") || null,
      completionEvidence:
        field(data, "completionEvidence") || null,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/app/sustainability");
}
