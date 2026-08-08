import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import {
  processAutomationRuntimeCallback,
} from "../runtime-callback";
import {
  resolveAutomationConnectorAdapter,
} from "./registry";
import {
  recordAutomationConnectorUsage,
  resolveAutomationConnectorConfiguration,
} from "./registry-service";
import { enforceAutomationConnectorPolicy } from "./policy";
import { recordAutomationConnectorAudit } from "./audit-service";
import {
  AUTOMATION_CONNECTOR_CIRCUIT_FAILURE_THRESHOLD,
  AutomationConnectorCircuitOpenError,
  assertAutomationConnectorCircuitAvailable,
  type AutomationConnectorCircuitState,
} from "./circuit-breaker";

type StoredActionRequest = {
  actionType?: unknown;
  configuration?: unknown;
  input?: unknown;
};

async function failAutomationAction(
  actionId: string,
  message: string,
) {
  return prisma.enterpriseAutomationRuntimeAction.update({
    where: { id: actionId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      lastError: message,
    },
  });
}

export async function executePendingAutomationAction(
  actionId: string,
) {
  const action =
    await prisma.enterpriseAutomationRuntimeAction.findUniqueOrThrow({
      where: { id: actionId },
    });

  if (
    action.status === "COMPLETED" ||
    action.status === "CANCELLED"
  ) {
    return action;
  }

  const request = action.requestPayload as StoredActionRequest;

  const configuration =
    request.configuration &&
    typeof request.configuration === "object" &&
    !Array.isArray(request.configuration)
      ? (request.configuration as Record<string, unknown>)
      : {};

  const connectorKey =
    typeof configuration.connectorKey === "string"
      ? configuration.connectorKey
      : null;

  let governedConfiguration = configuration;
  let governedConnectorId: string | null = null;
  let governedCircuitState: AutomationConnectorCircuitState = "CLOSED";

  if (connectorKey) {
    const resolved =
      await resolveAutomationConnectorConfiguration({
        tenantId: action.tenantId,
        connectorKey,
      });

    governedConnectorId = resolved.connector.id;

    try {
      const connector =
        await enforceAutomationConnectorPolicy({
          tenantId: action.tenantId,
          connectorId: governedConnectorId,
        });

      const circuit = assertAutomationConnectorCircuitAvailable({
        connectorKey: connector.connectorKey,
        consecutiveFailures: connector.consecutiveFailures,
        lastFailureAt: connector.lastFailureAt,
      });

      governedCircuitState = circuit.state;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Connector governance blocked execution.";
      const circuitOpen =
        error instanceof AutomationConnectorCircuitOpenError;

      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type: circuitOpen ? "CIRCUIT_BLOCKED" : "POLICY_BLOCKED",
        actionId: action.id,
        message,
        metadata: circuitOpen
          ? { retryAt: error.retryAt.toISOString() }
          : undefined,
      });

      await failAutomationAction(action.id, message);
      throw error;
    }

    governedConfiguration = {
      ...configuration,
      connector: resolved.configuration,
    };
  }

  const adapter = resolveAutomationConnectorAdapter(action.actionType);

  try {
    const result = await adapter.execute({
      tenantId: action.tenantId,
      actionId: action.id,
      idempotencyKey: action.idempotencyKey,
      actionType: action.actionType,
      configuration: governedConfiguration,
      input: request.input,
    });

    if (governedConnectorId) {
      await recordAutomationConnectorUsage(governedConnectorId);

      await prisma.enterpriseAutomationConnector.update({
        where: { id: governedConnectorId },
        data: {
          successCount: { increment: 1 },
          consecutiveFailures: 0,
        },
      });

      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type:
          governedCircuitState === "RECOVERY_READY"
            ? "CIRCUIT_RECOVERY_SUCCEEDED"
            : "EXECUTED",
        actionId: action.id,
        message:
          governedCircuitState === "RECOVERY_READY"
            ? "Connector recovery probe succeeded and the circuit was closed."
            : "Connector action executed successfully.",
      });
    }

    if (result.mode === "ASYNC") {
      return prisma.enterpriseAutomationRuntimeAction.update({
        where: { id: action.id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          externalReference: result.externalReference ?? null,
          responsePayload: toJson(result.payload ?? {}),
        },
      });
    }

    return (
      await processAutomationRuntimeCallback({
        tenantId: action.tenantId,
        actionId: action.id,
        outcome:
          result.mode === "ACKNOWLEDGED"
            ? "ACKNOWLEDGED"
            : "COMPLETED",
        externalReference: result.externalReference ?? null,
        source: "ENORSIS_CONNECTOR_EXECUTOR",
        payload: result.payload ?? {},
        externalCallbackId:
          `executor:${action.id}:${action.dispatchCount}`,
      })
    ).action;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown connector execution failure.";

    if (governedConnectorId) {
      const connector =
        await prisma.enterpriseAutomationConnector.update({
          where: { id: governedConnectorId },
          data: {
            failureCount: { increment: 1 },
            consecutiveFailures: { increment: 1 },
            lastFailureAt: new Date(),
            lastFailureMessage: message,
          },
        });

      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type: "EXECUTION_FAILED",
        actionId: action.id,
        message,
      });

      if (governedCircuitState === "RECOVERY_READY") {
        await recordAutomationConnectorAudit({
          tenantId: action.tenantId,
          connectorId: governedConnectorId,
          type: "CIRCUIT_RECOVERY_FAILED",
          actionId: action.id,
          message:
            "Connector recovery probe failed; the circuit cooldown was restarted.",
        });
      } else if (
        connector.consecutiveFailures ===
        AUTOMATION_CONNECTOR_CIRCUIT_FAILURE_THRESHOLD
      ) {
        await recordAutomationConnectorAudit({
          tenantId: action.tenantId,
          connectorId: governedConnectorId,
          type: "CIRCUIT_OPENED",
          actionId: action.id,
          message:
            "Connector circuit opened after repeated execution failures.",
        });
      }
    }

    await failAutomationAction(action.id, message);
    throw error;
  }
}

export async function runPendingAutomationActions() {
  const actions =
    await prisma.enterpriseAutomationRuntimeAction.findMany({
      where: { status: "DISPATCHED" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

  const results = [];

  for (const action of actions) {
    try {
      const result = await executePendingAutomationAction(action.id);

      results.push({
        actionId: action.id,
        status: result.status,
      });
    } catch (error) {
      results.push({
        actionId: action.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown connector failure.",
      });
    }
  }

  return {
    processed: actions.length,
    results,
  };
}
