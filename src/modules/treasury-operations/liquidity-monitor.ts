import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function notifyLeadership({
  tenantId,
  eventType,
  title,
  message,
  priority,
}: {
  tenantId: string;
  eventType: string;
  title: string;
  message: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      roles: {
        hasSome: [
          "TENANT_OWNER",
          "TENANT_ADMIN",
          "FINANCE",
        ] as never[],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  await Promise.allSettled(
    memberships.map((membership) =>
      createEnterpriseNotification({
        tenantId,
        eventType,
        recipientUserId: membership.user.id,
        recipientAddress: membership.user.email,
        title,
        message,
        actionUrl: "/app/requisition-to-order/treasury",
        priority,
        channels: membership.user.email
          ? ["IN_APP", "EMAIL"]
          : ["IN_APP"],
        data: {
          sourceModule: "treasury-liquidity-monitor",
        },
      }),
    ),
  );
}

async function evaluateTenantLiquidity(tenantId: string) {
  const policy = await prisma.treasuryLiquidityPolicy.findUnique({
    where: { tenantId },
  });

  if (!policy?.alertEnabled) {
    return {
      tenantId,
      status: "SKIPPED" as const,
      reason: "ALERTS_DISABLED",
    };
  }

  const fxPolicy = await prisma.treasuryFxPolicy.findUnique({
    where: { tenantId },
  });

  const baseCurrencyCode =
    fxPolicy?.baseCurrencyCode ?? "USD";

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const [accounts, forecasts, fxRates] = await Promise.all([
    prisma.treasuryAccount.findMany({
      where: {
        tenantId,
        active: true,
      },
    }),
    prisma.treasuryCashFlowForecast.findMany({
      where: {
        tenantId,
        status: {
          in: ["EXPECTED", "CONFIRMED"],
        },
        expectedDate: {
          gte: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          ),
          lte: horizon,
        },
      },
      orderBy: {
        expectedDate: "asc",
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

  const convert = (
    amount: number,
    currencyCode: string,
  ) => {
    if (currencyCode === baseCurrencyCode) {
      return amount;
    }

    const direct = latestRateByPair.get(
      `${currencyCode}->${baseCurrencyCode}`,
    );
    if (direct) {
      return amount * Number(direct.rate);
    }

    const inverse = latestRateByPair.get(
      `${baseCurrencyCode}->${currencyCode}`,
    );
    if (inverse && Number(inverse.rate) > 0) {
      return amount / Number(inverse.rate);
    }

    return null;
  };

  let runningCash = 0;
  const missingCurrencies = new Set<string>();

  for (const account of accounts) {
    const snapshot =
      latestSnapshotByAccount.get(account.id);
    const nativeBalance = snapshot
      ? Number(snapshot.availableBalance)
      : 0;

    const converted = convert(
      nativeBalance,
      account.currencyCode,
    );

    if (converted === null) {
      missingCurrencies.add(account.currencyCode);
    } else {
      runningCash += converted;
    }
  }

  const normalizedForecasts = forecasts.map((item) => {
    const converted = convert(
      Number(item.amount),
      item.currencyCode,
    );

    if (converted === null) {
      missingCurrencies.add(item.currencyCode);
    }

    return {
      item,
      amount: converted ?? 0,
    };
  });

  const warningThreshold =
    Number(policy.warningThreshold);
  const criticalThreshold =
    Number(policy.criticalThreshold);

  let firstWarning:
    | { date: Date; projectedCash: number }
    | null = null;
  let firstCritical:
    | { date: Date; projectedCash: number }
    | null = null;

  for (let offset = 0; offset <= 30; offset += 1) {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      12,
      0,
      0,
    );
    const key = dateKey(day);

    for (const forecast of normalizedForecasts) {
      if (
        dateKey(forecast.item.expectedDate) !== key
      ) {
        continue;
      }

      runningCash +=
        forecast.item.type === "INFLOW"
          ? forecast.amount
          : -forecast.amount;
    }

    if (
      !firstCritical &&
      criticalThreshold > 0 &&
      runningCash < criticalThreshold
    ) {
      firstCritical = {
        date: day,
        projectedCash: runningCash,
      };
    }

    if (
      !firstWarning &&
      warningThreshold > 0 &&
      runningCash < warningThreshold
    ) {
      firstWarning = {
        date: day,
        projectedCash: runningCash,
      };
    }
  }

  const activeBreach =
    firstCritical
      ? {
          severity: "CRITICAL" as const,
          ...firstCritical,
          thresholdAmount: criticalThreshold,
        }
      : firstWarning
        ? {
            severity: "WARNING" as const,
            ...firstWarning,
            thresholdAmount: warningThreshold,
          }
        : null;

  if (!activeBreach) {
    const resolved = await prisma.treasuryLiquidityAlert.updateMany({
      where: {
        tenantId,
        status: {
          in: ["OPEN", "ESCALATED"],
        },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        lastDetectedAt: now,
      },
    });

    return {
      tenantId,
      status: "HEALTHY" as const,
      resolvedAlerts: resolved.count,
      missingCurrencies: [...missingCurrencies],
    };
  }

  const alertKey = [
    tenantId,
    activeBreach.severity,
    dateKey(activeBreach.date),
    baseCurrencyCode,
  ].join(":");

  const existing =
    await prisma.treasuryLiquidityAlert.findUnique({
      where: {
        alertKey,
      },
    });

  let alert;

  if (!existing) {
    alert = await prisma.treasuryLiquidityAlert.create({
      data: {
        tenantId,
        alertKey,
        severity: activeBreach.severity,
        status: "OPEN",
        baseCurrencyCode,
        projectedCash:
          activeBreach.projectedCash,
        thresholdAmount:
          activeBreach.thresholdAmount,
        breachDate: activeBreach.date,
      },
    });

    await notifyLeadership({
      tenantId,
      eventType:
        activeBreach.severity === "CRITICAL"
          ? "Treasury.LiquidityCritical"
          : "Treasury.LiquidityWarning",
      title:
        activeBreach.severity === "CRITICAL"
          ? "Critical liquidity breach projected"
          : "Liquidity warning projected",
      message:
        `${activeBreach.severity} liquidity threshold is projected to be breached on ${activeBreach.date.toLocaleDateString()}. Projected ${baseCurrencyCode} cash: ${activeBreach.projectedCash.toFixed(2)}; threshold: ${activeBreach.thresholdAmount.toFixed(2)}.`,
      priority:
        activeBreach.severity === "CRITICAL"
          ? "URGENT"
          : "HIGH",
    });
  } else {
    alert = await prisma.treasuryLiquidityAlert.update({
      where: {
        id: existing.id,
      },
      data: {
        lastDetectedAt: now,
        projectedCash:
          activeBreach.projectedCash,
        thresholdAmount:
          activeBreach.thresholdAmount,
        breachDate: activeBreach.date,
        status:
          existing.status === "RESOLVED"
            ? "OPEN"
            : existing.status,
        resolvedAt:
          existing.status === "RESOLVED"
            ? null
            : existing.resolvedAt,
      },
    });
  }

  if (
    alert.severity === "CRITICAL" &&
    alert.status === "OPEN" &&
    now.getTime() -
      alert.firstDetectedAt.getTime() >=
      DAY_MS
  ) {
    alert = await prisma.treasuryLiquidityAlert.update({
      where: {
        id: alert.id,
      },
      data: {
        status: "ESCALATED",
        escalatedAt: now,
        lastDetectedAt: now,
      },
    });

    await notifyLeadership({
      tenantId,
      eventType:
        "Treasury.LiquidityCriticalEscalated",
      title:
        "Critical liquidity breach escalated",
      message:
        `A critical projected liquidity breach remains unresolved after 24 hours. Breach date: ${activeBreach.date.toLocaleDateString()}; projected ${baseCurrencyCode} cash: ${activeBreach.projectedCash.toFixed(2)}.`,
      priority: "URGENT",
    });
  }

  return {
    tenantId,
    status: alert.status,
    severity: alert.severity,
    alertId: alert.id,
    breachDate: alert.breachDate,
    projectedCash: Number(alert.projectedCash),
    missingCurrencies: [...missingCurrencies],
  };
}

export async function processTreasuryLiquidityAlerts() {
  const policies =
    await prisma.treasuryLiquidityPolicy.findMany({
      where: {
        alertEnabled: true,
      },
      select: {
        tenantId: true,
      },
    });

  const results = [];

  for (const policy of policies) {
    try {
      results.push(
        await evaluateTenantLiquidity(
          policy.tenantId,
        ),
      );
    } catch (error) {
      results.push({
        tenantId: policy.tenantId,
        status: "FAILED" as const,
        error:
          error instanceof Error
            ? error.message
            : "Unknown liquidity-monitor failure.",
      });
    }
  }

  return results;
}
