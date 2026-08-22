import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPaymentReconciliationWorkspace() {
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

  const [batches, reconciliations, statementImports] =
    await Promise.all([
    prisma.paymentBatch.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["PROCESSING", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.bankPaymentReconciliation.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { reconciliationDate: "desc" },
      take: 200,
    }),
    prisma.bankStatementImport.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  const reconciledIds = new Set(
    reconciliations.map((item) => item.paymentBatchId),
  );

  const unreconciled = batches.filter(
    (batch) => !reconciledIds.has(batch.id),
  );

  const matched = reconciliations.filter(
    (item) => item.status === "MATCHED",
  );
  const exceptions = reconciliations.filter(
    (item) => item.status !== "MATCHED",
  );
  const openExceptions = exceptions.filter(
    (item) =>
      item.resolutionStatus !== "RESOLVED",
  );
  const resolvedExceptions = exceptions.filter(
    (item) =>
      item.resolutionStatus === "RESOLVED",
  );

  const amount = (items: typeof reconciliations) =>
    items.reduce(
      (sum, item) => sum + Number(item.settledAmount),
      0,
    );

  return {
    unreconciled,
    reconciliations,
    statementImports,
    metrics: {
      unreconciledCount: unreconciled.length,
      matchedCount: matched.length,
      exceptionCount: exceptions.length,
      openExceptionCount: openExceptions.length,
      resolvedExceptionCount:
        resolvedExceptions.length,
      matchedAmount: amount(matched),
      exceptionAmount: amount(exceptions),
    },
  };
}
