import { prisma } from "@/lib/prisma";

export async function getAutomationConnectorMetrics(
  tenantId: string,
) {
  const connectors =
    await prisma.enterpriseAutomationConnector.findMany({
      where: { tenantId },
      include: {
        audits: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { name: "asc" },
    });

  return connectors.map((connector) => {
    const total =
      connector.successCount +
      connector.failureCount;

    const successRate =
      total > 0
        ? Math.round(
            (connector.successCount / total) * 10000,
          ) / 100
        : null;

    const health =
      connector.status !== "ACTIVE"
        ? "INACTIVE"
        : connector.consecutiveFailures >= 3
          ? "DEGRADED"
          : connector.lastTestStatus === "FAILED"
            ? "WARNING"
            : "HEALTHY";

    return {
      ...connector,
      successRate,
      health,
    };
  });
}
