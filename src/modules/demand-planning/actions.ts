"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createDemandPlanAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);

  await prisma.demandPlan.create({
    data: {
      tenantId: user.tenantId,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      periodStart: new Date(field(formData, "periodStart")),
      periodEnd: new Date(field(formData, "periodEnd")),
      planningHorizonDays: Number(field(formData, "planningHorizonDays") || 90),
      ownerUserId: user.id,
    },
  });

  revalidatePath("/app/demand-planning");
}

export async function addDemandForecastAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const demandPlanId = field(formData, "demandPlanId");
  const inventoryItemId = field(formData, "inventoryItemId");

  await prisma.demandPlan.findFirstOrThrow({
    where: { id: demandPlanId, tenantId: user.tenantId },
  });

  await prisma.inventoryItem.findFirstOrThrow({
    where: { id: inventoryItemId, tenantId: user.tenantId },
  });

  await prisma.demandForecast.upsert({
    where: {
      demandPlanId_inventoryItemId: { demandPlanId, inventoryItemId },
    },
    update: {
      method: field(formData, "method") as
        | "MANUAL"
        | "MOVING_AVERAGE"
        | "WEIGHTED_AVERAGE"
        | "SEASONAL"
        | "CONSUMPTION_BASED"
        | "IMPORTED",
      forecastQuantity: Number(field(formData, "forecastQuantity")),
      historicalConsumption: field(formData, "historicalConsumption")
        ? Number(field(formData, "historicalConsumption"))
        : null,
      committedDemand: Number(field(formData, "committedDemand") || 0),
      safetyStockDemand: Number(field(formData, "safetyStockDemand") || 0),
      confidencePercent: Number(field(formData, "confidencePercent") || 50),
      assumptions: field(formData, "assumptions") || null,
    },
    create: {
      demandPlanId,
      inventoryItemId,
      method: field(formData, "method") as
        | "MANUAL"
        | "MOVING_AVERAGE"
        | "WEIGHTED_AVERAGE"
        | "SEASONAL"
        | "CONSUMPTION_BASED"
        | "IMPORTED",
      forecastQuantity: Number(field(formData, "forecastQuantity")),
      historicalConsumption: field(formData, "historicalConsumption")
        ? Number(field(formData, "historicalConsumption"))
        : null,
      committedDemand: Number(field(formData, "committedDemand") || 0),
      safetyStockDemand: Number(field(formData, "safetyStockDemand") || 0),
      confidencePercent: Number(field(formData, "confidencePercent") || 50),
      assumptions: field(formData, "assumptions") || null,
    },
  });

  revalidatePath("/app/demand-planning");
}

export async function generateReplenishmentRecommendationsAction(
  formData: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const demandPlanId = field(formData, "demandPlanId");

  const plan = await prisma.demandPlan.findFirstOrThrow({
    where: { id: demandPlanId, tenantId: user.tenantId },
    include: {
      forecasts: {
        include: {
          inventoryItem: { include: { balances: true } },
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const forecast of plan.forecasts) {
      const item = forecast.inventoryItem;
      const available = item.balances.reduce(
        (sum, balance) => sum + Number(balance.quantityAvailable),
        0,
      );
      const safetyStock = Math.max(
        Number(forecast.safetyStockDemand),
        Number(item.safetyStock),
      );
      const required =
        Number(forecast.forecastQuantity) +
        Number(forecast.committedDemand) +
        safetyStock;
      const shortage = Math.max(0, required - available);
      const recommendedQuantity =
        shortage === 0
          ? 0
          : Math.max(shortage, Number(item.reorderQuantity));
      const unitCost = Number(item.standardCost ?? 0);
      const orderDate = new Date();
      const deliveryDate = item.leadTimeDays
        ? new Date(orderDate.getTime() + item.leadTimeDays * 86400000)
        : null;

      await tx.replenishmentRecommendation.upsert({
        where: {
          demandPlanId_inventoryItemId: {
            demandPlanId: plan.id,
            inventoryItemId: item.id,
          },
        },
        update: {
          currentAvailable: available,
          forecastDemand: forecast.forecastQuantity,
          safetyStock,
          recommendedQuantity,
          recommendedOrderDate: orderDate,
          expectedDeliveryDate: deliveryDate,
          estimatedUnitCost: unitCost > 0 ? unitCost : null,
          estimatedTotalCost:
            unitCost > 0 ? unitCost * recommendedQuantity : null,
          preferredSupplierId: item.preferredSupplierId,
          status: "PROPOSED",
        },
        create: {
          tenantId: user.tenantId,
          demandPlanId: plan.id,
          inventoryItemId: item.id,
          currentAvailable: available,
          forecastDemand: forecast.forecastQuantity,
          safetyStock,
          recommendedQuantity,
          recommendedOrderDate: orderDate,
          expectedDeliveryDate: deliveryDate,
          estimatedUnitCost: unitCost > 0 ? unitCost : null,
          estimatedTotalCost:
            unitCost > 0 ? unitCost * recommendedQuantity : null,
          preferredSupplierId: item.preferredSupplierId,
        },
      });
    }

    await tx.demandPlan.update({
      where: { id: plan.id },
      data: { status: "ACTIVE" },
    });
  });

  revalidatePath("/app/demand-planning");
}

export async function approveReplenishmentRecommendationAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const id = field(formData, "recommendationId");
  const recommendation =
    await prisma.replenishmentRecommendation.findFirstOrThrow({
      where: {
        id,
        tenantId: user.tenantId,
        status: { in: ["PROPOSED", "REVIEWED"] },
      },
    });

  await prisma.replenishmentRecommendation.update({
    where: { id: recommendation.id },
    data: {
      status: "APPROVED",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      approvedByUserId: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/app/demand-planning");
}
