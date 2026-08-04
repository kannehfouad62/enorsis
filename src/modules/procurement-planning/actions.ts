"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const amount = (formData: FormData, key: string) =>
  Number(field(formData, key) || 0);

export async function createProcurementPlanAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  await prisma.procurementPlan.create({
    data: {
      tenantId: user.tenantId,
      name: field(formData, "name"),
      fiscalYear: Number(field(formData, "fiscalYear")),
      objective: field(formData, "objective"),
      approvedBudget: amount(formData, "approvedBudget"),
      savingsTarget: amount(formData, "savingsTarget"),
      ownerUserId: user.id,
    },
  });

  revalidatePath("/app/planning");
}

export async function activateProcurementPlanAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const planId = field(formData, "planId");
  const plan = await prisma.procurementPlan.findFirstOrThrow({
    where: { id: planId, tenantId: user.tenantId, status: "DRAFT" },
  });

  await prisma.procurementPlan.update({
    where: { id: plan.id },
    data: {
      status: "ACTIVE",
      approvedByUserId: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/app/planning");
}

export async function createCategoryStrategyAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  await prisma.categoryStrategy.create({
    data: {
      tenantId: user.tenantId,
      procurementPlanId: field(formData, "procurementPlanId") || null,
      category: field(formData, "category"),
      name: field(formData, "name"),
      ownerUserId: user.id,
      currentSpend: amount(formData, "currentSpend"),
      addressableSpend: amount(formData, "addressableSpend"),
      savingsTarget: amount(formData, "savingsTarget"),
      supplierCount: Number(field(formData, "supplierCount") || 0),
      riskSummary: field(formData, "riskSummary") || null,
      marketSummary: field(formData, "marketSummary") || null,
      strategySummary: field(formData, "strategySummary"),
      sourcingApproach: field(formData, "sourcingApproach") || null,
      contractApproach: field(formData, "contractApproach") || null,
      supplierApproach: field(formData, "supplierApproach") || null,
      startsAt: new Date(field(formData, "startsAt")),
      targetCompletionAt: new Date(field(formData, "targetCompletionAt")),
      status: "ACTIVE",
    },
  });

  revalidatePath("/app/planning");
}

export async function createSavingsInitiativeAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const count = await prisma.savingsInitiative.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.savingsInitiative.create({
    data: {
      tenantId: user.tenantId,
      procurementPlanId: field(formData, "procurementPlanId") || null,
      categoryStrategyId: field(formData, "categoryStrategyId") || null,
      initiativeNumber: `SAVE-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      name: field(formData, "name"),
      description: field(formData, "description"),
      type: field(formData, "type") as
        | "COST_REDUCTION"
        | "COST_AVOIDANCE"
        | "WORKING_CAPITAL"
        | "DEMAND_REDUCTION"
        | "PROCESS_EFFICIENCY"
        | "RISK_AVOIDANCE",
      category: field(formData, "category") || null,
      ownerUserId: user.id,
      baselineAmount: amount(formData, "baselineAmount"),
      targetSavings: amount(formData, "targetSavings"),
      currencyCode: field(formData, "currencyCode") || "USD",
      confidencePercent: Number(field(formData, "confidencePercent") || 50),
      startsAt: new Date(field(formData, "startsAt")),
      targetRealizationAt: new Date(field(formData, "targetRealizationAt")),
      sourceType: field(formData, "sourceType") || null,
      sourceId: field(formData, "sourceId") || null,
      assumptions: field(formData, "assumptions") || null,
      risks: field(formData, "risks") || null,
    },
  });

  revalidatePath("/app/planning");
}

export async function updateSavingsInitiativeAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const initiativeId = field(formData, "initiativeId");
  const initiative = await prisma.savingsInitiative.findFirstOrThrow({
    where: { id: initiativeId, tenantId: user.tenantId },
  });

  const status = field(formData, "status") as
    | "IDEA"
    | "VALIDATED"
    | "APPROVED"
    | "IN_EXECUTION"
    | "REALIZED"
    | "CANCELLED";

  const validatedSavings = amount(formData, "validatedSavings");
  const realizedSavings = amount(formData, "realizedSavings");

  await prisma.savingsInitiative.update({
    where: { id: initiative.id },
    data: {
      status,
      validatedSavings,
      realizedSavings,
      financeValidatedBy:
        status === "VALIDATED" || status === "APPROVED"
          ? user.id
          : initiative.financeValidatedBy,
      financeValidatedAt:
        status === "VALIDATED" || status === "APPROVED"
          ? new Date()
          : initiative.financeValidatedAt,
      realizedAt: status === "REALIZED" ? new Date() : initiative.realizedAt,
    },
  });

  revalidatePath("/app/planning");
}

export async function addSavingsMilestoneAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const initiativeId = field(formData, "initiativeId");
  await prisma.savingsInitiative.findFirstOrThrow({
    where: { id: initiativeId, tenantId: user.tenantId },
  });

  await prisma.savingsMilestone.create({
    data: {
      savingsInitiativeId: initiativeId,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      ownerUserId: user.id,
      dueAt: new Date(field(formData, "dueAt")),
    },
  });

  revalidatePath("/app/planning");
}
