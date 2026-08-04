import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getApiGatewayAnalytics() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [clients, logs] = await Promise.all([
    prisma.apiClient.findMany({
      where: { tenantId },
      include: { credentials: true },
      orderBy: { name: "asc" },
    }),
    prisma.apiRequestLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const totalRequests = logs.length;
  const allowed = logs.filter((log) => log.outcome === "ALLOWED").length;
  const denied = logs.filter((log) => log.outcome === "DENIED").length;
  const rateLimited = logs.filter(
    (log) => log.outcome === "RATE_LIMITED",
  ).length;
  const errors = logs.filter((log) => log.outcome === "ERROR").length;
  const averageDuration =
    totalRequests === 0
      ? 0
      : Math.round(
          logs.reduce((sum, log) => sum + log.durationMs, 0) /
            totalRequests,
        );

  const pathCounts = new Map<string, number>();
  const scopeCounts = new Map<string, number>();

  for (const log of logs) {
    pathCounts.set(log.path, (pathCounts.get(log.path) ?? 0) + 1);
    if (log.scope) {
      scopeCounts.set(log.scope, (scopeCounts.get(log.scope) ?? 0) + 1);
    }
  }

  return {
    clients,
    logs,
    metrics: {
      totalRequests,
      allowed,
      denied,
      rateLimited,
      errors,
      averageDuration,
      activeClients: clients.filter((client) => client.status === "ACTIVE")
        .length,
      activeCredentials: clients.reduce(
        (sum, client) =>
          sum +
          client.credentials.filter(
            (credential) => credential.status === "ACTIVE",
          ).length,
        0,
      ),
    },
    topPaths: [...pathCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    topScopes: [...scopeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  };
}
