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
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  const [accounts, forecasts] = await Promise.all([
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

  const accountRows = accounts.map((account) => {
    const snapshot = latestSnapshotByAccount.get(account.id) ?? null;
    return {
      ...account,
      latestBalance: snapshot
        ? Number(snapshot.availableBalance)
        : 0,
      latestBalanceDate: snapshot?.balanceDate ?? null,
      latestLedgerBalance:
        snapshot?.ledgerBalance !== null &&
        snapshot?.ledgerBalance !== undefined
          ? Number(snapshot.ledgerBalance)
          : null,
    };
  });

  const totalAvailableCash = accountRows.reduce(
    (sum, account) => sum + account.latestBalance,
    0,
  );

  const expectedInflows = forecasts
    .filter((item) => item.type === "INFLOW")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expectedOutflows = forecasts
    .filter((item) => item.type === "OUTFLOW")
    .reduce((sum, item) => sum + Number(item.amount), 0);

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

    const dayInflows = forecasts
      .filter(
        (item) =>
          item.type === "INFLOW" &&
          item.expectedDate.toISOString().slice(0, 10) === key,
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const dayOutflows = forecasts
      .filter(
        (item) =>
          item.type === "OUTFLOW" &&
          item.expectedDate.toISOString().slice(0, 10) === key,
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

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
    forecasts.filter(
      (item) =>
        item.sourceModule === "PAYMENT_BATCH",
    ).length;

  const manualForecastCount =
    forecasts.length -
    automatedForecastCount;

  return {
    accounts: accountRows,
    forecasts,
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
