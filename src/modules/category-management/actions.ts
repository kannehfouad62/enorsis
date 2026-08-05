"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createCategoryStrategyAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  const categoryCode = field(data, "categoryCode");
  const categoryName = field(data, "categoryName");
  const title = field(data, "title");
  const description = field(data, "description");
  const periodStart = new Date(field(data, "periodStart"));
  const periodEnd = new Date(field(data, "periodEnd"));
  const managedSpend = Number(field(data, "managedSpend") || 0);

  await prisma.categoryStrategy.create({
    data: {
      tenantId: user.tenantId,
      category: categoryName,
      name: title,
      ownerUserId: user.id,
      currentSpend: managedSpend,
      addressableSpend: Number(field(data, "addressableSpend") || 0),
      savingsTarget: Number(field(data, "savingsTarget") || 0),
      supplierCount: Number(field(data, "supplierCount") || 0),
      riskSummary: field(data, "riskSummary") || null,
      marketSummary: field(data, "supplyMarketSummary") || null,
      strategySummary: description,
      sourcingApproach: field(data, "strategicObjectives") || null,
      supplierApproach: field(data, "supplierApproach") || null,
      startsAt: periodStart,
      targetCompletionAt: periodEnd,
      status: "UNDER_REVIEW",
      categoryCode: categoryCode || null,
      categoryName: categoryName || null,
      title: title || null,
      description: description || null,
      executiveSponsorUserId:
        field(data, "executiveSponsorUserId") || null,
      periodStart,
      periodEnd,
      currencyCode: field(data, "currencyCode") || "USD",
      managedSpend,
      preferredSupplierCount: Number(
        field(data, "preferredSupplierCount") || 0,
      ),
      demandDrivers: field(data, "demandDrivers") || null,
      supplyMarketSummary:
        field(data, "supplyMarketSummary") || null,
      strategicObjectives:
        field(data, "strategicObjectives") || null,
    },
  });

  revalidatePath("/app/categories");
}

export async function addCategoryOpportunityAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const categoryStrategyId = field(data, "categoryStrategyId");

  await prisma.categoryStrategy.findFirstOrThrow({
    where: { id: categoryStrategyId, tenantId: user.tenantId },
  });

  await prisma.categoryOpportunity.create({
    data: {
      categoryStrategyId,
      title: field(data, "title"),
      description: field(data, "description"),
      type: field(data, "type") as
        | "SOURCING"
        | "RENEGOTIATION"
        | "DEMAND_MANAGEMENT"
        | "SPECIFICATION_OPTIMIZATION"
        | "SUPPLIER_CONSOLIDATION"
        | "PROCESS_IMPROVEMENT"
        | "RISK_REDUCTION"
        | "SUSTAINABILITY"
        | "OTHER",
      estimatedValue: Number(field(data, "estimatedValue") || 0),
      probabilityPercent: Number(field(data, "probabilityPercent") || 50),
      complexityScore: Number(field(data, "complexityScore") || 3),
      riskScore: Number(field(data, "riskScore") || 3),
      ownerUserId: field(data, "ownerUserId") || user.id,
      targetStartAt: field(data, "targetStartAt")
        ? new Date(field(data, "targetStartAt"))
        : null,
      targetCompletionAt: field(data, "targetCompletionAt")
        ? new Date(field(data, "targetCompletionAt"))
        : null,
      assumptions: field(data, "assumptions") || null,
      blockers: field(data, "blockers") || null,
    },
  });

  revalidatePath("/app/categories");
}

export async function addCategoryMarketSignalAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const categoryStrategyId = field(data, "categoryStrategyId");

  await prisma.categoryStrategy.findFirstOrThrow({
    where: { id: categoryStrategyId, tenantId: user.tenantId },
  });

  await prisma.categoryMarketSignal.create({
    data: {
      categoryStrategyId,
      type: field(data, "type") as
        | "PRICE"
        | "CAPACITY"
        | "SUPPLY_RISK"
        | "REGULATORY"
        | "TECHNOLOGY"
        | "GEOPOLITICAL"
        | "SUSTAINABILITY"
        | "LABOR"
        | "OTHER",
      direction: field(data, "direction") as
        | "POSITIVE"
        | "NEUTRAL"
        | "NEGATIVE",
      title: field(data, "title"),
      description: field(data, "description"),
      source: field(data, "source") || null,
      sourceUrl: field(data, "sourceUrl") || null,
      confidencePercent: Number(field(data, "confidencePercent") || 50),
      impactScore: Number(field(data, "impactScore") || 3),
      observedAt: new Date(field(data, "observedAt")),
      expiresAt: field(data, "expiresAt")
        ? new Date(field(data, "expiresAt"))
        : null,
    },
  });

  revalidatePath("/app/categories");
}

export async function approveCategoryStrategyAction(data: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const id = field(data, "strategyId");

  const strategy = await prisma.categoryStrategy.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.categoryStrategy.update({
    where: { id: strategy.id },
    data: {
      status: "ACTIVE",
      approvedByUserId: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/app/categories");
}
