import type {
  AutomationConnectorAdapter,
} from "./types";
import {
  domainEventAutomationConnectorAdapter,
} from "./domain-event-adapter";
import {
  httpAutomationConnectorAdapter,
} from "./http-adapter";

const HTTP_ACTIONS = new Set([
  "HTTP_REQUEST",
  "WEBHOOK",
]);

const DOMAIN_EVENT_ACTIONS = new Set([
  "PUBLISH_EVENT",
  "CREATE_NOTIFICATION",
  "CREATE_TASK",
  "SEND_EMAIL",
  "START_WORKFLOW",
  "LOG_ACTIVITY",
]);

export function resolveAutomationConnectorAdapter(
  actionType: string,
): AutomationConnectorAdapter {
  if (HTTP_ACTIONS.has(actionType)) {
    return httpAutomationConnectorAdapter;
  }

  if (DOMAIN_EVENT_ACTIONS.has(actionType)) {
    return domainEventAutomationConnectorAdapter;
  }

  throw new Error(
    `No governed automation connector adapter is registered for ${actionType}.`,
  );
}
