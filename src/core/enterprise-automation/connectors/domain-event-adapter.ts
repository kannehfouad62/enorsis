import { publishDomainEvent } from "@/core/events";
import type {
  AutomationConnectorAdapter,
} from "./types";

export const domainEventAutomationConnectorAdapter: AutomationConnectorAdapter =
  {
    async execute(input) {
      const eventType = String(
        input.configuration.eventType ??
          input.configuration.actionType ??
          "EnterpriseAutomation.ActionRequested",
      );

      await publishDomainEvent({
        tenantId: input.tenantId,
        eventType,
        aggregateType:
          "EnterpriseAutomationRuntimeAction",
        aggregateId: input.actionId,
        sourceModule: "enterprise-automation",
        payload: {
          actionId: input.actionId,
          actionType: input.actionType,
          idempotencyKey: input.idempotencyKey,
          configuration: input.configuration,
          input: input.input,
        },
      });

      return {
        mode: "COMPLETED",
        payload: {
          eventType,
          published: true,
        },
      };
    },
  };
