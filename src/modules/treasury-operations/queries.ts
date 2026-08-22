import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getTreasuryWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "FINANCE",
      "ACCOUNTS_PAYABLE",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  const tenantId = session.user.tenantId;
  const today = new Date();
  const now = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  const [
    accounts,
    forecasts,
    liquidityPolicy,
    savedScenarios,
    fxPolicy,
    fxRates,
  ] = await Promise.all([
    prisma.treasuryAccount.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: [
        { accountType: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.treasuryCashFlowForecast.findMany({
      where: {
        tenantId,
        status: {
          in: ["EXPECTED", "CONFIRMED"],
        },
        expectedDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lte: horizon,
        },
      },
      orderBy: {
        expectedDate: "asc",
      },
    }),
    prisma.treasuryLiquidityPolicy.findUnique({
      where: { tenantId },
    }),
    prisma.treasuryForecastScenario.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.treasuryFxPolicy.findUnique({
      where: {
        tenantId,
      },
    }),
    prisma.treasuryFxRate.findMany({
      where: {
        tenantId,
        effectiveDate: {
          lte: now,
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    }),
  ]);

  const snapshots = accounts.length
    ? await prisma.treasuryBalanceSnapshot.findMany({
        where: {
          tenantId,
          treasuryAccountId: {
            in: accounts.map((account) => account.id),
          },
        },
        orderBy: {
          balanceDate: "desc",
        },
      })
    : [];

  const latestSnapshotByAccount = new Map<
    string,
    (typeof snapshots)[number]
  >();

  for (const snapshot of snapshots) {
    if (!latestSnapshotByAccount.has(snapshot.treasuryAccountId)) {
      latestSnapshotByAccount.set(
        snapshot.treasuryAccountId,
        snapshot,
      );
    }
  }

  const baseCurrencyCode =
    fxPolicy?.baseCurrencyCode ?? "USD";

  const latestRateByPair = new Map<
    string,
    (typeof fxRates)[number]
  >();

  for (const rate of fxRates) {
    const key =
      `${rate.fromCurrencyCode}->${rate.toCurrencyCode}`;

    if (!latestRateByPair.has(key)) {
      latestRateByPair.set(key, rate);
    }
  }

  const convertToBase = (
    amount: number,
    currencyCode: string,
  ) => {
    if (currencyCode === baseCurrencyCode) {
      return {
        convertedAmount: amount,
        rate: 1,
        rateDate: null as Date | null,
        sourceReference: "BASE_CURRENCY",
        missingRate: false,
      };
    }

    const direct = latestRateByPair.get(
      `${currencyCode}->${baseCurrencyCode}`,
    );

    if (direct) {
      return {
        convertedAmount:
          amount * Number(direct.rate),
        rate: Number(direct.rate),
        rateDate: direct.effectiveDate,
        sourceReference:
          direct.sourceReference ?? null,
        missingRate: false,
      };
    }

    const inverse = latestRateByPair.get(
      `${baseCurrencyCode}->${currencyCode}`,
    );

    if (inverse && Number(inverse.rate) > 0) {
      const rate = 1 / Number(inverse.rate);

      return {
        convertedAmount: amount * rate,
        rate,
        rateDate: inverse.effectiveDate,
        sourceReference:
          inverse.sourceReference ?? null,
        missingRate: false,
      };
    }

    return {
      convertedAmount: 0,
      rate: null,
      rateDate: null,
      sourceReference: null,
      missingRate: true,
    };
  };

  const accountRows = accounts.map((account) => {
    const snapshot =
      latestSnapshotByAccount.get(account.id) ?? null;

    const latestBalance = snapshot
      ? Number(snapshot.availableBalance)
      : 0;

    const conversion = convertToBase(
      latestBalance,
      account.currencyCode,
    );

    return {
      ...account,
      latestBalance,
      latestBalanceDate:
        snapshot?.balanceDate ?? null,
      latestLedgerBalance:
        snapshot?.ledgerBalance !== null &&
        snapshot?.ledgerBalance !== undefined
          ? Number(snapshot.ledgerBalance)
          : null,
      baseCurrencyAmount:
        conversion.convertedAmount,
      fxRate: conversion.rate,
      fxRateDate: conversion.rateDate,
      fxSourceReference:
        conversion.sourceReference,
      missingFxRate: conversion.missingRate,
    };
  });

  const normalizedForecasts = forecasts.map(
    (item) => {
      const conversion = convertToBase(
        Number(item.amount),
        item.currencyCode,
      );

      return {
        ...item,
        baseCurrencyAmount:
          conversion.convertedAmount,
        fxRate: conversion.rate,
        fxRateDate: conversion.rateDate,
        fxSourceReference:
          conversion.sourceReference,
        missingFxRate: conversion.missingRate,
      };
    },
  );

  const totalAvailableCash = accountRows.reduce(
    (sum, account) =>
      sum + account.baseCurrencyAmount,
    0,
  );

  const expectedInflows = normalizedForecasts
    .filter((item) => item.type === "INFLOW")
    .reduce(
      (sum, item) =>
        sum + item.baseCurrencyAmount,
      0,
    );

  const expectedOutflows = normalizedForecasts
    .filter((item) => item.type === "OUTFLOW")
    .reduce(
      (sum, item) =>
        sum + item.baseCurrencyAmount,
      0,
    );

  const projected30DayCash =
    totalAvailableCash + expectedInflows - expectedOutflows;

  const daily = new Map<
    string,
    {
      date: string;
      inflows: number;
      outflows: number;
      projectedCash: number;
    }
  >();

  let runningCash = totalAvailableCash;

  for (let offset = 0; offset <= 30; offset += 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
    );
    const key = date.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);

    const dayInflows = normalizedForecasts
      .filter(
        (item) =>
          item.type === "INFLOW" &&
          item.expectedDate.toISOString().slice(0, 10) === key,
      )
      .reduce(
        (sum, item) =>
          sum + item.baseCurrencyAmount,
        0,
      );

    const dayOutflows = normalizedForecasts
      .filter(
        (item) =>
          item.type === "OUTFLOW" &&
          item.expectedDate.toISOString().slice(0, 10) === key,
      )
      .reduce(
        (sum, item) =>
          sum + item.baseCurrencyAmount,
        0,
      );

    runningCash += dayInflows - dayOutflows;

    daily.set(key, {
      date: label,
      inflows: dayInflows,
      outflows: dayOutflows,
      projectedCash: runningCash,
    });
  }

  const lowestProjectedCash = Math.min(
    ...[...daily.values()].map((item) => item.projectedCash),
    totalAvailableCash,
  );

  const automatedForecastCount =
    normalizedForecasts.filter(
      (item) =>
        item.sourceModule === "PAYMENT_BATCH",
    ).length;

  const manualForecastCount =
    normalizedForecasts.length -
    automatedForecastCount;

  const missingFxCurrencies = [
    ...new Set(
      [
        ...accountRows
          .filter(
            (item) => item.missingFxRate,
          )
          .map(
            (item) => item.currencyCode,
          ),
        ...normalizedForecasts
          .filter(
            (item) => item.missingFxRate,
          )
          .map(
            (item) => item.currencyCode,
          ),
      ],
    ),
  ];

  const exposureByCurrency = new Map<
    string,
    {
      currencyCode: string;
      cashBalance: number;
      inflows: number;
      outflows: number;
      netExposure: number;
      baseCurrencyExposure: number;
      missingRate: boolean;
    }
  >();

  for (const account of accountRows) {
    const current =
      exposureByCurrency.get(
        account.currencyCode,
      ) ?? {
        currencyCode:
          account.currencyCode,
        cashBalance: 0,
        inflows: 0,
        outflows: 0,
        netExposure: 0,
        baseCurrencyExposure: 0,
        missingRate: false,
      };

    current.cashBalance +=
      account.latestBalance;
    current.baseCurrencyExposure +=
      account.baseCurrencyAmount;
    current.missingRate ||= account.missingFxRate;

    exposureByCurrency.set(
      account.currencyCode,
      current,
    );
  }

  for (const item of normalizedForecasts) {
    const current =
      exposureByCurrency.get(
        item.currencyCode,
      ) ?? {
        currencyCode:
          item.currencyCode,
        cashBalance: 0,
        inflows: 0,
        outflows: 0,
        netExposure: 0,
        baseCurrencyExposure: 0,
        missingRate: false,
      };

    if (item.type === "INFLOW") {
      current.inflows +=
        Number(item.amount);
      current.baseCurrencyExposure +=
        item.baseCurrencyAmount;
    } else {
      current.outflows +=
        Number(item.amount);
      current.baseCurrencyExposure -=
        item.baseCurrencyAmount;
    }

    current.missingRate ||= item.missingFxRate;

    exposureByCurrency.set(
      item.currencyCode,
      current,
    );
  }

  const currencyExposures = [
    ...exposureByCurrency.values(),
  ]
    .map((item) => ({
      ...item,
      netExposure:
        item.cashBalance +
        item.inflows -
        item.outflows,
    }))
    .sort(
      (a, b) =>
        Math.abs(b.baseCurrencyExposure) -
        Math.abs(a.baseCurrencyExposure),
    );

  const policy = liquidityPolicy
    ? {
        minimumCashBuffer: Number(liquidityPolicy.minimumCashBuffer),
        warningThreshold: Number(liquidityPolicy.warningThreshold),
        criticalThreshold: Number(liquidityPolicy.criticalThreshold),
        alertEnabled: liquidityPolicy.alertEnabled,
      }
    : {
        minimumCashBuffer: 0,
        warningThreshold: 0,
        criticalThreshold: 0,
        alertEnabled: true,
      };

  const scenarioDefinitions = [
    {
      name: "Base",
      inflowMultiplier: 1,
      outflowMultiplier: 1,
    },
    {
      name: "Upside",
      inflowMultiplier: 1.1,
      outflowMultiplier: 0.95,
    },
    {
      name: "Downside",
      inflowMultiplier: 0.9,
      outflowMultiplier: 1.1,
    },
    ...savedScenarios.map((scenario) => ({
      name: scenario.name,
      inflowMultiplier: Number(scenario.inflowMultiplier),
      outflowMultiplier: Number(scenario.outflowMultiplier),
    })),
  ];

  const scenarioSeries = scenarioDefinitions.map((scenario) => {
    let running = totalAvailableCash;

    const series = [...daily.values()].map((item) => {
      running +=
        item.inflows * scenario.inflowMultiplier -
        item.outflows * scenario.outflowMultiplier;

      return {
        date: item.date,
        projectedCash: running,
      };
    });

    const firstWarning = series.find(
      (item) =>
        policy.warningThreshold > 0 &&
        item.projectedCash < policy.warningThreshold,
    );

    const firstCritical = series.find(
      (item) =>
        policy.criticalThreshold > 0 &&
        item.projectedCash < policy.criticalThreshold,
    );

    const lowestCash = Math.min(
      totalAvailableCash,
      ...series.map((item) => item.projectedCash),
    );

    return {
      ...scenario,
      series,
      lowestCash,
      firstWarningDate: firstWarning?.date ?? null,
      firstCriticalDate: firstCritical?.date ?? null,
    };
  });

  const baseScenario = scenarioSeries[0];

  const liquidityStatus =
    policy.criticalThreshold > 0 &&
    baseScenario.lowestCash < policy.criticalThreshold
      ? "CRITICAL"
      : policy.warningThreshold > 0 &&
          baseScenario.lowestCash < policy.warningThreshold
        ? "WARNING"
        : policy.minimumCashBuffer > 0 &&
            baseScenario.lowestCash < policy.minimumCashBuffer
          ? "BELOW_BUFFER"
          : "HEALTHY";

  return {
    accounts: accountRows,
    forecasts: normalizedForecasts,
    baseCurrencyCode,
    currencyExposures,
    missingFxCurrencies,
    fxRates: fxRates.slice(0, 50),
    liquidityPolicy: policy,
    scenarioSeries,
    liquidityStatus,
    sourceMetrics: {
      automatedForecastCount,
      manualForecastCount,
    },
    summary: {
      totalAvailableCash,
      expectedInflows,
      expectedOutflows,
      projected30DayCash,
      lowestProjectedCash,
      accountCount: accountRows.length,
    },
    forecastSeries: [...daily.values()],
  };
}
