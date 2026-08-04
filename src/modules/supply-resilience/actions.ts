"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createSupplyRiskEventAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const probability = Number(field(formData, "probabilityPercent") || 50);
  const impact = Number(field(formData, "operationalImpact") || 3);
  const count = await prisma.supplyRiskEvent.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.supplyRiskEvent.create({
    data: {
      tenantId: user.tenantId,
      eventNumber: `RISK-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: field(formData, "title"),
      description: field(formData, "description"),
      type: field(formData, "type") as
        | "SUPPLIER_FAILURE"
        | "LOGISTICS_DISRUPTION"
        | "GEOPOLITICAL"
        | "CYBER"
        | "QUALITY"
        | "FINANCIAL"
        | "NATURAL_HAZARD"
        | "REGULATORY"
        | "LABOR"
        | "CAPACITY"
        | "OTHER",
      severity: field(formData, "severity") as
        | "LOW"
        | "MODERATE"
        | "HIGH"
        | "CRITICAL",
      countryCode: field(formData, "countryCode") || null,
      region: field(formData, "region") || null,
      detectedAt: new Date(field(formData, "detectedAt")),
      probabilityPercent: probability,
      financialImpact: field(formData, "financialImpact")
        ? Number(field(formData, "financialImpact"))
        : null,
      operationalImpact: impact,
      overallRiskScore: (probability / 100) * impact * 20,
      ownerUserId: user.id,
      executiveSummary: field(formData, "executiveSummary") || null,
    },
  });

  revalidatePath("/app/resilience");
}

export async function addSupplyRiskExposureAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const eventId = field(formData, "eventId");

  await prisma.supplyRiskEvent.findFirstOrThrow({
    where: { id: eventId, tenantId: user.tenantId },
  });

  await prisma.supplyRiskExposure.create({
    data: {
      supplyRiskEventId: eventId,
      type: field(formData, "type") as
        | "SUPPLIER"
        | "CATEGORY"
        | "COUNTRY"
        | "SITE"
        | "CONTRACT"
        | "PURCHASE_ORDER",
      referenceId: field(formData, "referenceId") || null,
      referenceLabel: field(formData, "referenceLabel"),
      criticality: Number(field(formData, "criticality") || 3),
      spendAtRisk: field(formData, "spendAtRisk")
        ? Number(field(formData, "spendAtRisk"))
        : null,
      daysOfSupply: field(formData, "daysOfSupply")
        ? Number(field(formData, "daysOfSupply"))
        : null,
      alternateSourceCount: Number(field(formData, "alternateSourceCount") || 0),
      dependencyPercent: Number(field(formData, "dependencyPercent") || 0),
      impactSummary: field(formData, "impactSummary") || null,
      mitigationSummary: field(formData, "mitigationSummary") || null,
    },
  });

  revalidatePath("/app/resilience");
}

export async function createResiliencePlanAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);

  await prisma.resiliencePlan.create({
    data: {
      tenantId: user.tenantId,
      supplyRiskEventId: field(formData, "supplyRiskEventId") || null,
      name: field(formData, "name"),
      description: field(formData, "description"),
      status: "ACTIVE",
      ownerUserId: user.id,
      activationCriteria: field(formData, "activationCriteria"),
      recoveryObjective: field(formData, "recoveryObjective"),
      recoveryTimeHours: field(formData, "recoveryTimeHours")
        ? Number(field(formData, "recoveryTimeHours"))
        : null,
      minimumServicePercent: Number(field(formData, "minimumServicePercent") || 50),
      alternateSuppliers: field(formData, "alternateSuppliers")
        .split(",").map((item) => item.trim()).filter(Boolean),
      alternateSites: field(formData, "alternateSites")
        .split(",").map((item) => item.trim()).filter(Boolean),
      inventoryStrategy: field(formData, "inventoryStrategy") || null,
      logisticsStrategy: field(formData, "logisticsStrategy") || null,
      communicationsPlan: field(formData, "communicationsPlan") || null,
    },
  });

  revalidatePath("/app/resilience");
}
