export type AutomationExecutionContext = {
  tenantId: string;
  triggerType:
    | "DOMAIN_EVENT"
    | "SCHEDULE"
    | "RECORD_CONDITION"
    | "MANUAL";
  triggerReference?: string | null;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
};

export type AutomationActionConfiguration = {
  workflowDefinitionId?: string;
  notificationTitle?: string;
  notificationBody?: string;
  taskTitle?: string;
  eventType?: string;
  activityTitle?: string;
  activityDescription?: string;
};
