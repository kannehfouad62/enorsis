import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const num = (value: unknown) =>
  value === null || value === undefined ? 0 : Number(value);

const round = (value: number, digits = 2) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const percentChange = (current: number, forecast: number) => {
  if (current === 0) return forecast === 0 ? 0 : 100;
  return ((forecast - current) / Math.abs(current)) * 100;
};

const riskFromChange = (change: number) => {
  const magnitude = Math.abs(change);
  if (magnitude >= 35) return "CRITICAL";
  if (magnitude >= 20) return "HIGH";
  if (magnitude >= 10) return "MEDIUM";
  return "LOW";
};

const confidenceFromSamples = (count: number) =>
  Math.min(95, Math.max(40, 45 + count * 5));

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function linearForecast(values: number[], horizonPeriods: number) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY =
    values.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < n; index += 1) {
    numerator += (index - meanX) * (values[index] - meanY);
    denominator += (index - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  const nextIndex = n - 1 + horizonPeriods;

  return Math.max(0, intercept + slope * nextIndex);
}

export async function generatePredictiveProcurementForecast(input: {
  tenantId: string;
  createdByUserId: string;
  horizonDays: number;
}) {
  const now = new Date();
  const sourceWindowStart = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  );

  const [requests, demandPlans, suppliers, marketplaceProfiles] =
    await Promise.all([
      prisma.purchaseRequest.findMany({
        where: {
          tenantId: input.tenantId,
          createdAt: { gte: sourceWindowStart },
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          usdEquivalent: true,
          lines: {
            select: {
              category: true,
              lineTotal: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.demandPlan.findMany({
        where: { tenantId: input.tenantId },
        include: {
          forecasts: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { periodEnd: "desc" },
        take: 50,
      }),
      prisma.supplier.findMany({
        where: { tenantId: input.tenantId },
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
          riskTier: true,
          qualificationStatus: true,
          status: true,
        },
        orderBy: { legalName: "asc" },
      }),
      prisma.supplierMarketplaceProfile.findMany({
        where: { tenantId: input.tenantId },
        select: {
          supplierId: true,
          verificationStatus: true,
          riskScore: true,
          performanceScore: true,
          marketplaceScore: true,
        },
      }),
    ]);

  const run = await prisma.predictiveProcurementForecastRun.create({
    data: {
      tenantId: input.tenantId,
      createdByUserId: input.createdByUserId,
      horizonDays: input.horizonDays,
      sourceWindowStart,
      sourceWindowEnd: now,
      assumptions: {
        spendMethod: "monthly_linear_trend",
        demandMethod:
          "latest_plan_forecast_vs_historical_consumption",
        supplierRiskMethod:
          "master_risk_plus_marketplace_risk_and_performance",
        note:
          "Forecasts are decision support and require human review before operational use.",
      },
    },
  });

  const signals: Array<{
    tenantId: string;
    forecastRunId: string;
    signalType: string;
    scopeKey: string;
    scopeLabel: string;
    currentValue: number | null;
    forecastValue: number | null;
    changePercent: number | null;
    confidence: number;
    riskLevel: string;
    evidence: Prisma.InputJsonValue;
  }> = [];

  const monthlySpend = new Map<string, number>();
  for (const request of requests) {
    const key = monthKey(request.createdAt);
    monthlySpend.set(
      key,
      (monthlySpend.get(key) ?? 0) + num(request.usdEquivalent),
    );
  }

  const spendSeries = [...monthlySpend.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);

  const recentSpend =
    spendSeries.slice(-3).reduce((sum, value) => sum + value, 0) /
    Math.max(1, spendSeries.slice(-3).length);

  const horizonMonths = Math.max(
    1,
    Math.round(input.horizonDays / 30),
  );

  const forecastMonthlySpend = linearForecast(
    spendSeries,
    horizonMonths,
  );

  const spendChange = percentChange(
    recentSpend,
    forecastMonthlySpend,
  );

  signals.push({
    tenantId: input.tenantId,
    forecastRunId: run.id,
    signalType: "SPEND_FORECAST",
    scopeKey: "enterprise-spend-usd",
    scopeLabel: "Enterprise monthly procurement demand",
    currentValue: round(recentSpend, 4),
    forecastValue: round(forecastMonthlySpend, 4),
    changePercent: round(spendChange, 4),
    confidence: confidenceFromSamples(spendSeries.length),
    riskLevel: riskFromChange(spendChange),
    evidence: {
      currency: "USD",
      observedMonths: spendSeries.length,
      monthlySeries: spendSeries.map((value) => round(value, 2)),
      horizonMonths,
      source: "PurchaseRequest.usdEquivalent",
    },
  });

  const demandByItem = new Map<
    string,
    {
      label: string;
      sku: string;
      historical: number;
      forecast: number;
      samples: number;
      planIds: string[];
    }
  >();

  for (const plan of demandPlans) {
    for (const forecast of plan.forecasts) {
      const item = forecast.inventoryItem;
      const existing = demandByItem.get(item.id) ?? {
        label: item.name,
        sku: item.sku,
        historical: 0,
        forecast: 0,
        samples: 0,
        planIds: [],
      };

      existing.historical += num(
        forecast.historicalConsumption,
      );
      existing.forecast +=
        num(forecast.forecastQuantity) +
        num(forecast.committedDemand) +
        num(forecast.safetyStockDemand);
      existing.samples += 1;
      existing.planIds.push(plan.id);

      demandByItem.set(item.id, existing);
    }
  }

  const demandSignals = [...demandByItem.entries()]
    .map(([itemId, item]) => {
      const change = percentChange(
        item.historical,
        item.forecast,
      );

      return {
        itemId,
        ...item,
        change,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.change) - Math.abs(left.change),
    )
    .slice(0, 30);

  for (const item of demandSignals) {
    signals.push({
      tenantId: input.tenantId,
      forecastRunId: run.id,
      signalType: "DEMAND_FORECAST",
      scopeKey: item.itemId,
      scopeLabel: `${item.sku} — ${item.label}`,
      currentValue: round(item.historical, 4),
      forecastValue: round(item.forecast, 4),
      changePercent: round(item.change, 4),
      confidence: confidenceFromSamples(item.samples),
      riskLevel: riskFromChange(item.change),
      evidence: {
        sku: item.sku,
        sampleCount: item.samples,
        demandPlanIds: [...new Set(item.planIds)],
        source:
          "DemandPlan.forecasts historicalConsumption vs forecastQuantity + committedDemand + safetyStockDemand",
      },
    });
  }

  const profileBySupplier = new Map(
    marketplaceProfiles.map((profile) => [
      profile.supplierId,
      profile,
    ]),
  );

  const riskTierBase: Record<string, number> = {
    LOW: 20,
    MEDIUM: 45,
    HIGH: 70,
    CRITICAL: 90,
  };

  for (const supplier of suppliers) {
    const profile = profileBySupplier.get(supplier.id);
    const masterRisk =
      riskTierBase[supplier.riskTier] ?? 50;
    const marketplaceRisk =
      profile?.riskScore === null ||
      profile?.riskScore === undefined
        ? masterRisk
        : Number(profile.riskScore);
    const performance =
      profile?.performanceScore === null ||
      profile?.performanceScore === undefined
        ? 50
        : Number(profile.performanceScore);

    const projectedRisk = round(
      Math.max(
        0,
        Math.min(
          100,
          masterRisk * 0.5 +
            marketplaceRisk * 0.35 +
            (100 - performance) * 0.15,
        ),
      ),
      2,
    );

    const riskLevel =
      projectedRisk >= 80
        ? "CRITICAL"
        : projectedRisk >= 65
          ? "HIGH"
          : projectedRisk >= 45
            ? "MEDIUM"
            : "LOW";

    if (
      ["HIGH", "CRITICAL"].includes(riskLevel) ||
      ["HIGH", "CRITICAL"].includes(supplier.riskTier)
    ) {
      signals.push({
        tenantId: input.tenantId,
        forecastRunId: run.id,
        signalType: "SUPPLIER_RISK_FORECAST",
        scopeKey: supplier.id,
        scopeLabel:
          supplier.tradingName ?? supplier.legalName,
        currentValue: round(masterRisk, 2),
        forecastValue: projectedRisk,
        changePercent: round(
          percentChange(masterRisk, projectedRisk),
          4,
        ),
        confidence: profile ? 82 : 62,
        riskLevel,
        evidence: {
          supplierNumber: supplier.supplierNumber,
          masterRiskTier: supplier.riskTier,
          qualificationStatus:
            supplier.qualificationStatus,
          supplierStatus: supplier.status,
          marketplaceRiskScore:
            profile?.riskScore === null ||
            profile?.riskScore === undefined
              ? null
              : Number(profile.riskScore),
          performanceScore:
            profile?.performanceScore === null ||
            profile?.performanceScore === undefined
              ? null
              : Number(profile.performanceScore),
          verificationStatus:
            profile?.verificationStatus ?? null,
          marketplaceScore:
            profile?.marketplaceScore === null ||
            profile?.marketplaceScore === undefined
              ? null
              : Number(profile.marketplaceScore),
        },
      });
    }
  }

  if (signals.length > 0) {
    await prisma.predictiveProcurementForecastSignal.createMany({
      data: signals,
    });
  }

  return {
    run,
    signalCount: signals.length,
  };
}
