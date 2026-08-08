import { prisma } from "@/lib/prisma";
import { recordAutomationConnectorAudit } from "./audit-service";
import {
  getAutomationConnectorCircuitState,
  type AutomationConnectorCircuitState,
} from "./circuit-breaker";
import { testAutomationConnector } from "./test-service";

const HOUR_MS = 60 * 60 * 1000;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateReliabilityScore(input: {
  availabilityPercent: number | null;
  consecutiveFailures: number;
  circuitState: AutomationConnectorCircuitState;
  lastTestStatus: string | null;
  status: string;
}) {
  if (input.status !== "ACTIVE") {
    return 0;
  }

  let score = input.availabilityPercent ?? 100;
  score -= Math.min(input.consecutiveFailures * 4, 20);

  if (input.circuitState === "OPEN") {
    score -= 25;
  } else if (input.circuitState === "RECOVERY_READY") {
    score -= 10;
  }

  if (input.lastTestStatus === "FAILED") {
    score -= 10;
  }

  return Math.max(0, Math.min(100, round2(score)));
}

export async function getAutomationConnectorSlaSnapshot(input: {
  tenantId: string;
  connectorId: string;
  targetPercent: number;
  windowHours: number;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  lastTestStatus: string | null;
  status: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const since = new Date(
    now.getTime() - Math.max(1, input.windowHours) * HOUR_MS,
  );

  const [successfulExecutions, successfulRecoveries, failedExecutions] =
    await Promise.all([
      prisma.enterpriseAutomationConnectorAudit.count({
        where: {
          tenantId: input.tenantId,
          connectorId: input.connectorId,
          type: "EXECUTED",
          createdAt: { gte: since },
        },
      }),
      prisma.enterpriseAutomationConnectorAudit.count({
        where: {
          tenantId: input.tenantId,
          connectorId: input.connectorId,
          type: "CIRCUIT_RECOVERY_SUCCEEDED",
          createdAt: { gte: since },
        },
      }),
      prisma.enterpriseAutomationConnectorAudit.count({
        where: {
          tenantId: input.tenantId,
          connectorId: input.connectorId,
          type: "EXECUTION_FAILED",
          createdAt: { gte: since },
        },
      }),
    ]);

  const successes = successfulExecutions + successfulRecoveries;
  const total = successes + failedExecutions;
  const availabilityPercent =
    total > 0 ? round2((successes / total) * 100) : null;
  const breached =
    availabilityPercent !== null &&
    availabilityPercent < input.targetPercent;

  const circuit = getAutomationConnectorCircuitState({
    consecutiveFailures: input.consecutiveFailures,
    lastFailureAt: input.lastFailureAt,
    now,
  });

  return {
    windowStartedAt: since,
    windowEndedAt: now,
    successes,
    failures: failedExecutions,
    total,
    availabilityPercent,
    targetPercent: input.targetPercent,
    breached,
    status:
      availabilityPercent === null
        ? ("NO_DATA" as const)
        : breached
          ? ("BREACHED" as const)
          : ("WITHIN_SLA" as const),
    reliabilityScore: calculateReliabilityScore({
      availabilityPercent,
      consecutiveFailures: input.consecutiveFailures,
      circuitState: circuit.state,
      lastTestStatus: input.lastTestStatus,
      status: input.status,
    }),
  };
}

export async function evaluateAutomationConnectorSla(input: {
  tenantId: string;
  connectorId: string;
  actionId?: string | null;
}) {
  const connector =
    await prisma.enterpriseAutomationConnector.findFirstOrThrow({
      where: {
        id: input.connectorId,
        tenantId: input.tenantId,
      },
    });

  const snapshot = await getAutomationConnectorSlaSnapshot({
    tenantId: input.tenantId,
    connectorId: connector.id,
    targetPercent: connector.slaTargetPercent,
    windowHours: connector.slaWindowHours,
    consecutiveFailures: connector.consecutiveFailures,
    lastFailureAt: connector.lastFailureAt,
    lastTestStatus: connector.lastTestStatus,
    status: connector.status,
  });

  if (snapshot.breached && !connector.slaBreached) {
    await prisma.enterpriseAutomationConnector.update({
      where: { id: connector.id },
      data: {
        slaBreached: true,
        slaBreachCount: { increment: 1 },
        lastSlaBreachAt: new Date(),
      },
    });

    await recordAutomationConnectorAudit({
      tenantId: input.tenantId,
      connectorId: connector.id,
      type: "SLA_BREACH_DETECTED",
      actionId: input.actionId ?? null,
      message:
        `Connector availability ${snapshot.availabilityPercent}% is below ` +
        `${connector.slaTargetPercent}% SLA.`,
      metadata: {
        availabilityPercent: snapshot.availabilityPercent,
        targetPercent: connector.slaTargetPercent,
        windowHours: connector.slaWindowHours,
        executions: snapshot.total,
      },
    });
  } else if (!snapshot.breached && connector.slaBreached) {
    await prisma.enterpriseAutomationConnector.update({
      where: { id: connector.id },
      data: {
        slaBreached: false,
        lastSlaRecoveredAt: new Date(),
      },
    });

    await recordAutomationConnectorAudit({
      tenantId: input.tenantId,
      connectorId: connector.id,
      type: "SLA_RECOVERED",
      actionId: input.actionId ?? null,
      message:
        snapshot.availabilityPercent === null
          ? "Connector SLA returned to a non-breached state."
          : `Connector availability recovered to ${snapshot.availabilityPercent}%.`,
      metadata: {
        availabilityPercent: snapshot.availabilityPercent,
        targetPercent: connector.slaTargetPercent,
        windowHours: connector.slaWindowHours,
      },
    });
  }

  const remediationCooldownElapsed =
    !connector.lastRemediationAt ||
    Date.now() - connector.lastRemediationAt.getTime() >=
      connector.remediationCooldownMinutes * 60 * 1000;

  const shouldRemediate =
    snapshot.breached &&
    connector.autoRemediationEnabled &&
    connector.status === "ACTIVE" &&
    connector.consecutiveFailures >=
      connector.remediationFailureThreshold &&
    remediationCooldownElapsed;

  if (!shouldRemediate) {
    return { snapshot, remediation: null };
  }

  await prisma.enterpriseAutomationConnector.update({
    where: { id: connector.id },
    data: {
      remediationCount: { increment: 1 },
      lastRemediationAt: new Date(),
    },
  });

  await recordAutomationConnectorAudit({
    tenantId: input.tenantId,
    connectorId: connector.id,
    type: "REMEDIATION_TRIGGERED",
    actionId: input.actionId ?? null,
    message:
      "Governed connector remediation validation was triggered after an SLA breach.",
    metadata: {
      consecutiveFailures: connector.consecutiveFailures,
      remediationFailureThreshold:
        connector.remediationFailureThreshold,
    },
  });

  const result = await testAutomationConnector({
    tenantId: input.tenantId,
    connectorId: connector.id,
  });

  await recordAutomationConnectorAudit({
    tenantId: input.tenantId,
    connectorId: connector.id,
    type: result.ok
      ? "REMEDIATION_SUCCEEDED"
      : "REMEDIATION_FAILED",
    actionId: input.actionId ?? null,
    message: result.ok
      ? "Governed connector remediation validation succeeded."
      : result.message ??
        "Governed connector remediation validation failed.",
    metadata: {
      recoveredCircuit: result.recovered,
    },
  });

  return { snapshot, remediation: result };
}

export async function evaluateAutomationConnectorSlaSafely(input: {
  tenantId: string;
  connectorId: string;
  actionId?: string | null;
}) {
  try {
    return await evaluateAutomationConnectorSla(input);
  } catch (error) {
    console.error(
      "Connector SLA evaluation failed without interrupting runtime execution.",
      {
        connectorId: input.connectorId,
        actionId: input.actionId ?? null,
        error:
          error instanceof Error
            ? error.message
            : "Unknown SLA evaluation error.",
      },
    );
    return null;
  }
}
