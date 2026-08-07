export type ConditionOperator =
  | "EQ"
  | "NEQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "CONTAINS"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "IN"
  | "NOT_IN"
  | "EXISTS"
  | "NOT_EXISTS"
  | "BETWEEN";

export type ConditionLeaf = {
  id: string;
  kind: "condition";
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  secondValue?: unknown;
};

export type ConditionGroup = {
  id: string;
  kind: "group";
  combinator: "AND" | "OR";
  children: Array<ConditionGroup | ConditionLeaf>;
};

export type DesignerAction = {
  id: string;
  actionType:
    | "START_WORKFLOW"
    | "CREATE_NOTIFICATION"
    | "CREATE_TASK"
    | "PUBLISH_EVENT"
    | "LOG_ACTIVITY";
  configuration: Record<string, unknown>;
};

export type AutomationDesignerState = {
  trigger: {
    triggerType:
      | "DOMAIN_EVENT"
      | "SCHEDULE"
      | "RECORD_CONDITION"
      | "MANUAL";
    eventType?: string;
    scheduleExpression?: string;
    recordType?: string;
  };
  conditions: ConditionGroup;
  actions: DesignerAction[];
};
