import { prisma } from "@/lib/prisma";
import { getAutomationConnectorCircuitState } from "./circuit-breaker";

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
    const total = connector.successCount + connector.failureCount;

    const successRate =
      total > 0
        ? Math.round(
            (connector.successCount / total) * 10000,
          ) / 100
        : null;

    const circuit = getAutomationConnectorCircuitState({
      consecutiveFailures: connector.consecutiveFailures,
      lastFailureAt: connector.lastFailureAt,
    });

    const health =
      connector.status !== "ACTIVE"
        ? "INACTIVE"
        : circuit.state === "OPEN"
          ? "OPEN_CIRCUIT"
          : circuit.state === "RECOVERY_READY"
            ? "RECOVERY"
            : connector.consecutiveFailures >= 3
              ? "DEGRADED"
              : connector.lastTestStatus === "FAILED"
                ? "WARNING"
                : "HEALTHY";

    return {
      ...connector,
      successRate,
      health,
      circuitState: circuit.state,
      circuitRetryAt: circuit.retryAt,
    };
  });
}
