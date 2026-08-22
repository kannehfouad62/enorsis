import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MATERIALITY_THRESHOLD = 1000;

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function ageBucket(date: Date, now: Date) {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)),
  );

  if (days <= 7) return "0–7 days";
  if (days <= 30) return "8–30 days";
  if (days <= 60) return "31–60 days";
  return "61+ days";
}

export async function getReconciliationAnalytics() {
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
  const now = new Date();
  const twelveMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );

  const [
    reconciliations,
    paymentBatches,
    statementImports,
    governanceCases,
    closePeriods,
  ] = await Promise.all([
    prisma.bankPaymentReconciliation.findMany({
      where: { tenantId },
      orderBy: { reconciliationDate: "asc" },
    }),
    prisma.paymentBatch.findMany({
      where: {
        tenantId,
        status: { in: ["PROCESSING", "COMPLETED"] },
      },
      select: {
        id: true,
        totalAmount: true,
        currencyCode: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bankStatementImport.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reconciliationGovernanceCase.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reconciliationClosePeriod.findMany({
      where: { tenantId },
      orderBy: { periodEnd: "desc" },
      take: 24,
    }),
  ]);

  const reconciledBatchIds = new Set(
    reconciliations.map((item) => item.paymentBatchId),
  );

  const unreconciled = paymentBatches.filter(
    (batch) => !reconciledBatchIds.has(batch.id),
  );

  const matched = reconciliations.filter((item) => item.status === "MATCHED");
  const partial = reconciliations.filter((item) => item.status === "PARTIAL");
  const unmatched = reconciliations.filter((item) => item.status === "UNMATCHED");
  const duplicate = reconciliations.filter((item) => item.status === "DUPLICATE");

  const openExceptions = reconciliations.filter(
    (item) =>
      item.status !== "MATCHED" &&
      item.resolutionStatus !== "RESOLVED",
  );

  const resolvedExceptions = reconciliations.filter(
    (item) =>
      item.status !== "MATCHED" &&
      item.resolutionStatus === "RESOLVED",
  );

  const materialOpen = openExceptions.filter((item) => {
    const variance = Math.abs(
      Number(item.expectedAmount) - Number(item.settledAmount),
    );
    return item.status === "DUPLICATE" || variance >= MATERIALITY_THRESHOLD;
  });

  const reconciledCount = reconciliations.length;
  const eligibleCount = reconciledCount + unreconciled.length;

  const reconciliationRate =
    eligibleCount > 0 ? (reconciledCount / eligibleCount) * 100 : 0;

  const autoMatchRate =
    reconciledCount > 0 ? (matched.length / reconciledCount) * 100 : 0;

  const totalExceptionCount = reconciledCount - matched.length;
  const exceptionResolutionRate =
    totalExceptionCount > 0
      ? (resolvedExceptions.length / totalExceptionCount) * 100
      : 100;

  const openExceptionValue = openExceptions.reduce(
    (sum, item) =>
      sum +
      Math.abs(Number(item.expectedAmount) - Number(item.settledAmount)),
    0,
  );

  const unreconciledValue = unreconciled.reduce(
    (sum, item) => sum + Number(item.totalAmount),
    0,
  );

  const duplicateExposure = duplicate
    .filter((item) => item.resolutionStatus !== "RESOLVED")
    .reduce((sum, item) => sum + Number(item.settledAmount), 0);

  const pendingApprovals = governanceCases.filter(
    (item) => item.status === "PENDING_APPROVAL",
  );

  const overdueGovernance = governanceCases.filter(
    (item) =>
      item.status !== "CLOSED" &&
      item.status !== "REJECTED" &&
      item.dueAt &&
      item.dueAt < now,
  );

  const classificationData = [
    { name: "Matched", value: matched.length },
    { name: "Partial", value: partial.length },
    { name: "Unmatched", value: unmatched.length },
    { name: "Duplicate", value: duplicate.length },
    { name: "Unreconciled", value: unreconciled.length },
  ];

  const agingOrder = ["0–7 days", "8–30 days", "31–60 days", "61+ days"];

  const agingMap = new Map(
    agingOrder.map((bucket) => [bucket, { bucket, count: 0, value: 0 }]),
  );

  for (const item of openExceptions) {
    const bucket = ageBucket(item.createdAt, now);
    const current = agingMap.get(bucket)!;
    current.count += 1;
    current.value += Math.abs(
      Number(item.expectedAmount) - Number(item.settledAmount),
    );
  }

  const agingData = agingOrder.map((bucket) => agingMap.get(bucket)!);

  const monthly = new Map<
    string,
    {
      month: string;
      reconciled: number;
      matched: number;
      exceptions: number;
      variance: number;
    }
  >();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const key = monthKey(date);
    monthly.set(key, {
      month: monthLabel(key),
      reconciled: 0,
      matched: 0,
      exceptions: 0,
      variance: 0,
    });
  }

  for (const item of reconciliations) {
    if (item.reconciliationDate < twelveMonthsAgo) continue;
    const key = monthKey(item.reconciliationDate);
    const current = monthly.get(key);
    if (!current) continue;

    current.reconciled += 1;
    if (item.status === "MATCHED") current.matched += 1;
    else current.exceptions += 1;

    current.variance += Math.abs(
      Number(item.expectedAmount) - Number(item.settledAmount),
    );
  }

  const monthlyData = [...monthly.values()];

  const importPerformance = statementImports.slice(-12).map((item) => ({
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(item.createdAt),
    matched: item.matchedRows,
    exceptions: item.exceptionRows,
    total: item.totalRows,
  }));

  const latestClose = closePeriods[0] ?? null;

  const closeReady =
    materialOpen.length === 0 && pendingApprovals.length === 0;

  return {
    summary: {
      reconciliationRate,
      autoMatchRate,
      exceptionResolutionRate,
      eligibleCount,
      reconciledCount,
      unreconciledCount: unreconciled.length,
      openExceptionCount: openExceptions.length,
      materialOpenCount: materialOpen.length,
      pendingApprovalCount: pendingApprovals.length,
      overdueGovernanceCount: overdueGovernance.length,
      openExceptionValue,
      unreconciledValue,
      duplicateExposure,
      closeReady,
      latestClose: latestClose
        ? {
            periodStart: latestClose.periodStart,
            periodEnd: latestClose.periodEnd,
            status: latestClose.status,
            closedAt: latestClose.closedAt,
          }
        : null,
    },
    classificationData,
    agingData,
    monthlyData,
    importPerformance,
    materialExceptions: materialOpen
      .sort((a, b) => {
        const av = Math.abs(Number(a.expectedAmount) - Number(a.settledAmount));
        const bv = Math.abs(Number(b.expectedAmount) - Number(b.settledAmount));
        return bv - av;
      })
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        statementReference: item.statementReference,
        status: item.status,
        currencyCode: item.currencyCode,
        variance: Math.abs(
          Number(item.expectedAmount) - Number(item.settledAmount),
        ),
        reconciliationDate: item.reconciliationDate,
        resolutionStatus: item.resolutionStatus,
      })),
  };
}
