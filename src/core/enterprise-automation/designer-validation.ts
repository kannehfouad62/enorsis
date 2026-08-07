import type {
  AutomationDesignerState,
  ConditionGroup,
  ConditionLeaf,
} from "./designer-types";

export type RuleValidationIssue = {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  nodeId?: string;
};

function walkGroup(
  group: ConditionGroup,
  issues: RuleValidationIssue[],
) {
  if (group.children.length === 0) {
    issues.push({
      severity: "WARNING",
      code: "EMPTY_GROUP",
      message: "Condition group contains no conditions.",
      nodeId: group.id,
    });
  }

  for (const child of group.children) {
    if (child.kind === "group") {
      walkGroup(child, issues);
      continue;
    }

    const condition = child as ConditionLeaf;

    if (!condition.field.trim()) {
      issues.push({
        severity: "ERROR",
        code: "MISSING_FIELD",
        message: "A condition is missing its field.",
        nodeId: condition.id,
      });
    }

    if (
      !["EXISTS", "NOT_EXISTS"].includes(condition.operator) &&
      condition.value === undefined
    ) {
      issues.push({
        severity: "ERROR",
        code: "MISSING_VALUE",
        message: "A condition requires a comparison value.",
        nodeId: condition.id,
      });
    }

    if (
      condition.operator === "BETWEEN" &&
      condition.secondValue === undefined
    ) {
      issues.push({
        severity: "ERROR",
        code: "MISSING_SECOND_VALUE",
        message: "BETWEEN requires a second comparison value.",
        nodeId: condition.id,
      });
    }
  }
}

export function validateAutomationDesignerState(
  state: AutomationDesignerState,
) {
  const issues: RuleValidationIssue[] = [];

  if (
    state.trigger.triggerType === "DOMAIN_EVENT" &&
    !state.trigger.eventType
  ) {
    issues.push({
      severity: "ERROR",
      code: "MISSING_EVENT_TYPE",
      message: "Domain-event trigger requires an event type.",
    });
  }

  if (
    state.trigger.triggerType === "SCHEDULE" &&
    !state.trigger.scheduleExpression
  ) {
    issues.push({
      severity: "ERROR",
      code: "MISSING_SCHEDULE",
      message: "Schedule trigger requires a schedule expression.",
    });
  }

  walkGroup(state.conditions, issues);

  if (state.actions.length === 0) {
    issues.push({
      severity: "ERROR",
      code: "NO_ACTIONS",
      message: "Automation rule must contain at least one action.",
    });
  }

  const duplicateActionIds = state.actions
    .map((action) => action.id)
    .filter(
      (id, index, all) => all.indexOf(id) !== index,
    );

  if (duplicateActionIds.length > 0) {
    issues.push({
      severity: "ERROR",
      code: "DUPLICATE_ACTION_IDS",
      message: "Automation contains duplicate action node IDs.",
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
}
