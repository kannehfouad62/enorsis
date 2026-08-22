import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getTreasuryConnectivityWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted =
    session.user.roles.some((role) =>
      [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
        "PLATFORM_SUPER_ADMIN",
        "PLATFORM_SUPPORT",
      ].includes(role),
    );

  if (!permitted) {
    redirect("/app/unauthorized");
  }

  const tenantId =
    session.user.tenantId;

  const [
    integrations,
    treasuryAccounts,
    accountLinks,
    syncLogs,
  ] = await Promise.all([
    prisma.integrationConnection.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        inboundEnabled: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.treasuryAccount.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.treasuryExternalAccountLink.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.treasuryConnectivitySyncLog.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        processedAt: "desc",
      },
      take: 100,
    }),
  ]);

  return {
    integrations,
    treasuryAccounts,
    accountLinks: accountLinks.map((link) => ({
      ...link,
      integration:
        integrations.find(
          (item) =>
            item.id ===
            link.integrationId,
        ) ?? null,
      treasuryAccount:
        treasuryAccounts.find(
          (item) =>
            item.id ===
            link.treasuryAccountId,
        ) ?? null,
    })),
    syncLogs,
    metrics: {
      activeConnections:
        integrations.length,
      mappedAccounts:
        accountLinks.length,
      successfulSyncs:
        syncLogs.filter(
          (item) =>
            item.status === "SUCCEEDED",
        ).length,
      failedSyncs:
        syncLogs.filter(
          (item) =>
            item.status === "FAILED",
        ).length,
    },
  };
}
