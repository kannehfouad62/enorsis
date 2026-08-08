import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) => value === null || value === undefined ? 0 : Number(value);
const round = (value: number, digits = 2) => { const m = 10 ** digits; return Math.round(value * m) / m; };
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

type ItemDemand = {
  forecastQuantity: number;
  historicalConsumption: number;
  committedDemand: number;
  safetyStockDemand: number;
  sampleCount: number;
  planIds: string[];
  periodDays: number;
};

function stockoutProbability(input: { available: number; dailyDemand: number; leadTimeDays: number; safetyStock: number }) {
  if (input.dailyDemand <= 0) return 0;
  const leadTimeDemand = input.dailyDemand * input.leadTimeDays;
  const protection = input.available + input.safetyStock;
  if (protection <= 0) return 100;
  const coverage = protection / Math.max(leadTimeDemand, 0.000001);
  if (coverage >= 2) return 5;
  if (coverage >= 1.5) return 15;
  if (coverage >= 1.2) return 30;
  if (coverage >= 1) return 45;
  if (coverage >= 0.75) return 65;
  if (coverage >= 0.5) return 80;
  return 95;
}

function recommendation(input: { stockoutProbability: number; suggestedReorderQty: number; excessQuantity: number; predictedReorderPoint: number; currentReorderPoint: number }) {
  if (input.stockoutProbability >= 75) return "URGENT_REORDER";
  if (input.suggestedReorderQty > 0) return "REORDER";
  if (input.excessQuantity > 0) return "REDUCE_OR_REBALANCE";
  if (Math.abs(input.predictedReorderPoint - input.currentReorderPoint) > Math.max(1, input.currentReorderPoint * 0.15)) return "ADJUST_REORDER_POLICY";
  return "MONITOR";
}

export async function generatePredictiveInventoryOptimization(input: { tenantId: string; createdByUserId: string; horizonDays: number }) {
  const [items, balances, demandPlans] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { tenantId: input.tenantId, status: "ACTIVE" }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.inventoryBalance.findMany({ where: { item: { tenantId: input.tenantId, status: "ACTIVE" } }, include: { item: true, location: true } }),
    prisma.demandPlan.findMany({ where: { tenantId: input.tenantId }, include: { forecasts: { include: { inventoryItem: { select: { id: true, sku: true, name: true } } } } }, orderBy: { periodEnd: "desc" }, take: 50 }),
  ]);

  const run = await prisma.predictiveInventoryOptimizationRun.create({
    data: {
      tenantId: input.tenantId,
      createdByUserId: input.createdByUserId,
      horizonDays: input.horizonDays,
      assumptions: {
        demandBasis: "DemandPlan forecasts + committed demand + safety stock demand",
        stockBasis: "InventoryBalance aggregated across tenant locations",
        reorderPoint: "daily forecast demand x lead time + recommended safety stock",
        safetyStock: "max(configured safety stock, 25% of lead-time demand)",
        excessThreshold: "125% of forecast horizon demand plus recommended safety stock",
        note: "Decision support only; no replenishment order is created automatically.",
      },
    },
  });

  const balanceByItem = new Map<string, { onHand: number; reserved: number; available: number; weightedCostNumerator: number; weightedCostDenominator: number; locationCount: number }>();
  for (const balance of balances) {
    const current = balanceByItem.get(balance.inventoryItemId) ?? { onHand: 0, reserved: 0, available: 0, weightedCostNumerator: 0, weightedCostDenominator: 0, locationCount: 0 };
    const onHand = num(balance.quantityOnHand);
    const cost = num(balance.averageUnitCost ?? balance.item.standardCost);
    current.onHand += onHand;
    current.reserved += num(balance.quantityReserved);
    current.available += num(balance.quantityAvailable);
    current.weightedCostNumerator += onHand * cost;
    current.weightedCostDenominator += Math.max(0, onHand);
    current.locationCount += 1;
    balanceByItem.set(balance.inventoryItemId, current);
  }

  const demandByItem = new Map<string, ItemDemand>();
  for (const plan of demandPlans) {
    const periodDays = Math.max(1, Math.ceil((plan.periodEnd.getTime() - plan.periodStart.getTime()) / 86400000));
    for (const forecast of plan.forecasts) {
      const current = demandByItem.get(forecast.inventoryItemId) ?? { forecastQuantity: 0, historicalConsumption: 0, committedDemand: 0, safetyStockDemand: 0, sampleCount: 0, planIds: [], periodDays: 0 };
      current.forecastQuantity += num(forecast.forecastQuantity);
      current.historicalConsumption += num(forecast.historicalConsumption);
      current.committedDemand += num(forecast.committedDemand);
      current.safetyStockDemand += num(forecast.safetyStockDemand);
      current.sampleCount += 1;
      current.planIds.push(plan.id);
      current.periodDays += periodDays;
      demandByItem.set(forecast.inventoryItemId, current);
    }
  }

  const signals: Prisma.PredictiveInventoryOptimizationSignalCreateManyInput[] = [];
  for (const item of items) {
    const balance = balanceByItem.get(item.id) ?? { onHand: 0, reserved: 0, available: 0, weightedCostNumerator: 0, weightedCostDenominator: 0, locationCount: 0 };
    const demand = demandByItem.get(item.id);
    const totalDemand = demand ? demand.forecastQuantity + demand.committedDemand + demand.safetyStockDemand : 0;
    const periodDays = demand && demand.sampleCount > 0 ? Math.max(1, demand.periodDays / demand.sampleCount) : input.horizonDays;
    const dailyDemand = totalDemand > 0
      ? totalDemand / Math.max(1, periodDays * Math.max(1, demand?.sampleCount ?? 1))
      : demand && demand.historicalConsumption > 0
        ? demand.historicalConsumption / Math.max(1, periodDays * Math.max(1, demand.sampleCount))
        : 0;
    const horizonDemand = dailyDemand * input.horizonDays;
    const leadTimeDays = Math.max(1, item.leadTimeDays ?? 1);
    const leadTimeDemand = dailyDemand * leadTimeDays;
    const currentSafetyStock = num(item.safetyStock);
    const recommendedSafetyStock = Math.max(currentSafetyStock, leadTimeDemand * 0.25);
    const predictedReorderPoint = leadTimeDemand + recommendedSafetyStock;
    const currentReorderPoint = num(item.reorderPoint);
    const suggestedReorderQty = Math.max(0, horizonDemand + recommendedSafetyStock - balance.available);
    const daysOfSupply = dailyDemand > 0 ? balance.available / dailyDemand : null;
    const excessThreshold = horizonDemand * 1.25 + recommendedSafetyStock;
    const excessQuantity = Math.max(0, balance.available - excessThreshold);
    const unitCost = balance.weightedCostDenominator > 0 ? balance.weightedCostNumerator / balance.weightedCostDenominator : num(item.standardCost);
    const excessValue = excessQuantity * unitCost;
    const probability = stockoutProbability({ available: balance.available, dailyDemand, leadTimeDays, safetyStock: recommendedSafetyStock });
    const rec = recommendation({ stockoutProbability: probability, suggestedReorderQty, excessQuantity, predictedReorderPoint, currentReorderPoint });
    const riskLevel = probability >= 85 ? "CRITICAL" : probability >= 65 ? "HIGH" : probability >= 40 || suggestedReorderQty > 0 || excessValue > 0 ? "MEDIUM" : "LOW";
    const confidence = clamp(45 + Math.min(30, (demand?.sampleCount ?? 0) * 6) + Math.min(15, balance.locationCount * 3), 40, 95);

    signals.push({
      tenantId: input.tenantId,
      optimizationRunId: run.id,
      inventoryItemId: item.id,
      sku: item.sku,
      itemName: item.name,
      category: item.category,
      currentOnHand: round(balance.onHand, 4),
      currentAvailable: round(balance.available, 4),
      currentReserved: round(balance.reserved, 4),
      dailyDemand: round(dailyDemand, 6),
      horizonDemand: round(horizonDemand, 4),
      currentReorderPoint: round(currentReorderPoint, 4),
      predictedReorderPoint: round(predictedReorderPoint, 4),
      currentSafetyStock: round(currentSafetyStock, 4),
      recommendedSafetyStock: round(recommendedSafetyStock, 4),
      suggestedReorderQty: round(suggestedReorderQty, 4),
      stockoutProbability: round(probability, 2),
      daysOfSupply: daysOfSupply === null ? null : round(daysOfSupply, 2),
      excessQuantity: round(excessQuantity, 4),
      excessValue: round(excessValue, 4),
      unitCost: round(unitCost, 4),
      leadTimeDays,
      riskLevel,
      recommendation: rec,
      confidence: round(confidence, 2),
      evidence: {
        demandPlanIds: [...new Set(demand?.planIds ?? [])],
        demandSampleCount: demand?.sampleCount ?? 0,
        forecastQuantity: demand?.forecastQuantity ?? 0,
        committedDemand: demand?.committedDemand ?? 0,
        safetyStockDemand: demand?.safetyStockDemand ?? 0,
        historicalConsumption: demand?.historicalConsumption ?? 0,
        locationCount: balance.locationCount,
        configuredReorderQuantity: num(item.reorderQuantity),
        source: "InventoryItem + InventoryBalance + DemandPlan forecasts",
      },
    });
  }

  if (signals.length > 0) await prisma.predictiveInventoryOptimizationSignal.createMany({ data: signals });
  return { run, signalCount: signals.length };
}
