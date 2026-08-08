export type AutomationConnectorExecutionInput = {
  tenantId: string;
  actionId: string;
  idempotencyKey: string;
  actionType: string;
  configuration: Record<string, unknown>;
  input: unknown;
};

export type AutomationConnectorExecutionResult =
  | {
      mode: "COMPLETED";
      externalReference?: string | null;
      payload?: Record<string, unknown>;
    }
  | {
      mode: "ACKNOWLEDGED";
      externalReference?: string | null;
      payload?: Record<string, unknown>;
    }
  | {
      mode: "ASYNC";
      externalReference?: string | null;
      payload?: Record<string, unknown>;
    };

export type AutomationConnectorAdapter = {
  execute(
    input: AutomationConnectorExecutionInput,
  ): Promise<AutomationConnectorExecutionResult>;
};
