import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MATERIALITY_THRESHOLD = 1000;

function dateOnly(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

export async function getTreasuryExecutiveReport() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "FINANCE",
      "PROCUREMENT_EXECUTIVE",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  const tenantId = session.user.tenantId;
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const [
    accounts,
    forecasts,
    fxPolicy,
    fxRates,
    liquidityAlerts,
    connectivityIncidents,
    reconciliations,
    governanceCases,
    certifications,
    closePeriods,
  ] = await Promise.all([
    prisma.treasuryAccount.findMany({
      where: { tenantId, active: true },
    }),
    prisma.treasuryCashFlowForecast.findMany({
      where: {
        tenantId,
        status: { in: ["EXPECTED", "CONFIRMED"] },
        expectedDate: {
          gte: dateOnly(now),
          lte: horizon,
        },
      },
    }),
    prisma.treasuryFxPolicy.findUnique({
      where: { tenantId },
    }),
    prisma.treasuryFxRate.findMany({
      where: {
        tenantId,
        effectiveDate: { lte: now },
      },
      orderBy: { effectiveDate: "desc" },
    }),
    prisma.treasuryLiquidityAlert.findMany({
      where: {
        tenantId,
        status: { in: ["OPEN", "ESCALATED"] },
      },
    }),
    prisma.treasuryConnectivityHealthIncident.findMany({
      where: {
        tenantId,
        status: "OPEN",
      },
    }),
    prisma.bankPaymentReconciliation.findMany({
      where: {
        tenantId,
        status: {
          in: ["PARTIAL", "UNMATCHED", "DUPLICATE"],
        },
        resolutionStatus: {
          not: "RESOLVED",
        },
      },
    }),
    prisma.reconciliationGovernanceCase.findMany({
      where: {
        tenantId,
        status: "PENDING_APPROVAL",
      },
    }),
    prisma.treasuryCloseCertification.findMany({
      where: { tenantId },
      orderBy: { periodEnd: "desc" },
      take: 24,
    }),
    prisma.reconciliationClosePeriod.findMany({
      where: { tenantId },
      orderBy: { periodEnd: "desc" },
      take: 12,
    }),
  ]);

  const snapshots = accounts.length
    ? await prisma.treasuryBalanceSnapshot.findMany({
        where: {
          tenantId,
          treasuryAccountId: {
            in: accounts.map((item) => item.id),
          },
        },
        orderBy: { balanceDate: "desc" },
      })
    : [];

  const latestSnapshot = new Map<string, (typeof snapshots)[number]>();
  for (const snapshot of snapshots) {
    if (!latestSnapshot.has(snapshot.treasuryAccountId)) {
      latestSnapshot.set(snapshot.treasuryAccountId, snapshot);
    }
  }

  const baseCurrencyCode = fxPolicy?.baseCurrencyCode ?? "USD";
  const latestRate = new Map<string, (typeof fxRates)[number]>();

  for (const rate of fxRates) {
    const key = `${rate.fromCurrencyCode}->${rate.toCurrencyCode}`;
    if (!latestRate.has(key)) latestRate.set(key, rate);
  }

  function convert(amount: number, currencyCode: string) {
    if (currencyCode === baseCurrencyCode) {
      return { amount, missing: false };
    }

    const direct = latestRate.get(
      `${currencyCode}->${baseCurrencyCode}`,
    );
    if (direct) {
      return {
        amount: amount * Number(direct.rate),
        missing: false,
      };
    }

    const inverse = latestRate.get(
      `${baseCurrencyCode}->${currencyCode}`,
    );
    if (inverse && Number(inverse.rate) > 0) {
      return {
        amount: amount / Number(inverse.rate),
        missing: false,
      };
    }

    return { amount: 0, missing: true };
  }

  const missingFx = new Set<string>();

  let availableCash = 0;
  for (const account of accounts) {
    const balance = latestSnapshot.get(account.id);
    const native = balance
      ? Number(balance.availableBalance)
      : 0;
    const converted = convert(native, account.currencyCode);

    if (converted.missing) missingFx.add(account.currencyCode);
    availableCash += converted.amount;
  }

  let expectedInflows = 0;
  let expectedOutflows = 0;

  for (const forecast of forecasts) {
    const converted = convert(
      Number(forecast.amount),
      forecast.currencyCode,
    );

    if (converted.missing) {
      missingFx.add(forecast.currencyCode);
    }

    if (forecast.type === "INFLOW") {
      expectedInflows += converted.amount;
    } else {
      expectedOutflows += converted.amount;
    }
  }

  const projected30DayCash =
    availableCash + expectedInflows - expectedOutflows;

  const criticalLiquidityAlerts =
    liquidityAlerts.filter(
      (item) => item.severity === "CRITICAL",
    ).length;

  const criticalConnectivityIncidents =
    connectivityIncidents.filter(
      (item) => item.severity === "CRITICAL",
    ).length;

  const materialReconciliationBlockers =
    reconciliations.filter((item) => {
      const variance = Math.abs(
        Number(item.expectedAmount) -
          Number(item.settledAmount),
      );

      return (
        item.status === "DUPLICATE" ||
        variance >= MATERIALITY_THRESHOLD
      );
    }).length;

  const pendingReconciliationApprovals =
    governanceCases.length;

  const readiness =
    criticalLiquidityAlerts === 0 &&
    criticalConnectivityIncidents === 0 &&
    materialReconciliationBlockers === 0 &&
    pendingReconciliationApprovals === 0 &&
    missingFx.size === 0;

  return {
    baseCurrencyCode,
    summary: {
      availableCash,
      expectedInflows,
      expectedOutflows,
      projected30DayCash,
      accountCount: accounts.length,
      criticalLiquidityAlerts,
      criticalConnectivityIncidents,
      materialReconciliationBlockers,
      pendingReconciliationApprovals,
      missingFxRateCount: missingFx.size,
      readiness,
    },
    missingFxCurrencies: [...missingFx].sort(),
    certifications,
    latestReconciliationClose: closePeriods[0] ?? null,
    riskItems: [
      {
        name: "Critical liquidity alerts",
        count: criticalLiquidityAlerts,
        blocking: criticalLiquidityAlerts > 0,
      },
      {
        name: "Critical connectivity incidents",
        count: criticalConnectivityIncidents,
        blocking: criticalConnectivityIncidents > 0,
      },
      {
        name: "Material reconciliation blockers",
        count: materialReconciliationBlockers,
        blocking: materialReconciliationBlockers > 0,
      },
      {
        name: "Pending reconciliation approvals",
        count: pendingReconciliationApprovals,
        blocking: pendingReconciliationApprovals > 0,
      },
      {
        name: "Missing FX rates",
        count: missingFx.size,
        blocking: missingFx.size > 0,
      },
    ],
  };
}
