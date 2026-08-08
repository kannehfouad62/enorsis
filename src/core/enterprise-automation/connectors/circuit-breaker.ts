export const AUTOMATION_CONNECTOR_CIRCUIT_FAILURE_THRESHOLD = 5;
export const AUTOMATION_CONNECTOR_CIRCUIT_COOLDOWN_MS = 15 * 60 * 1000;

export type AutomationConnectorCircuitState =
  | "CLOSED"
  | "OPEN"
  | "RECOVERY_READY";

export class AutomationConnectorCircuitOpenError extends Error {
  readonly retryAt: Date;

  constructor(input: { connectorKey: string; retryAt: Date }) {
    super(
      `Connector ${input.connectorKey} circuit is open until ${input.retryAt.toISOString()}.`,
    );
    this.name = "AutomationConnectorCircuitOpenError";
    this.retryAt = input.retryAt;
  }
}

export function getAutomationConnectorCircuitState(input: {
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  now?: Date;
}) {
  if (
    input.consecutiveFailures <
      AUTOMATION_CONNECTOR_CIRCUIT_FAILURE_THRESHOLD ||
    !input.lastFailureAt
  ) {
    return {
      state: "CLOSED" as AutomationConnectorCircuitState,
      retryAt: null,
    };
  }

  const retryAt = new Date(
    input.lastFailureAt.getTime() +
      AUTOMATION_CONNECTOR_CIRCUIT_COOLDOWN_MS,
  );
  const now = input.now ?? new Date();

  if (now.getTime() < retryAt.getTime()) {
    return {
      state: "OPEN" as AutomationConnectorCircuitState,
      retryAt,
    };
  }

  return {
    state: "RECOVERY_READY" as AutomationConnectorCircuitState,
    retryAt,
  };
}

export function assertAutomationConnectorCircuitAvailable(input: {
  connectorKey: string;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  now?: Date;
}) {
  const circuit = getAutomationConnectorCircuitState(input);

  if (circuit.state === "OPEN" && circuit.retryAt) {
    throw new AutomationConnectorCircuitOpenError({
      connectorKey: input.connectorKey,
      retryAt: circuit.retryAt,
    });
  }

  return circuit;
}
