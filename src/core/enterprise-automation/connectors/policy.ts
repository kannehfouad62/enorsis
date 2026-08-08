import { prisma } from "@/lib/prisma";

export async function enforceAutomationConnectorPolicy(input: {
  tenantId: string;
  connectorId: string;
}) {
  const connector =
    await prisma.enterpriseAutomationConnector.findFirstOrThrow({
      where: {
        id: input.connectorId,
        tenantId: input.tenantId,
        status: "ACTIVE",
      },
    });

  if (!connector.maxDailyExecutions) {
    return connector;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const usedToday =
    await prisma.enterpriseAutomationConnectorAudit.count({
      where: {
        connectorId: connector.id,
        type: "EXECUTED",
        createdAt: { gte: start },
      },
    });

  if (usedToday >= connector.maxDailyExecutions) {
    throw new Error(
      `Connector ${connector.connectorKey} exceeded its daily execution policy.`,
    );
  }

  return connector;
}
