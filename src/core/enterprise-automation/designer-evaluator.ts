import type {
  AutomationDesignerState,
  ConditionGroup,
  ConditionLeaf,
} from "./designer-types";

function getPath(
  value: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

function evaluateLeaf(
  condition: ConditionLeaf,
  payload: Record<string, unknown>,
) {
  const observed = getPath(payload, condition.field);

  switch (condition.operator) {
    case "EQ":
      return observed === condition.value;
    case "NEQ":
      return observed !== condition.value;
    case "GT":
      return Number(observed) > Number(condition.value);
    case "GTE":
      return Number(observed) >= Number(condition.value);
    case "LT":
      return Number(observed) < Number(condition.value);
    case "LTE":
      return Number(observed) <= Number(condition.value);
    case "CONTAINS":
      return String(observed ?? "").includes(
        String(condition.value ?? ""),
      );
    case "STARTS_WITH":
      return String(observed ?? "").startsWith(
        String(condition.value ?? ""),
      );
    case "ENDS_WITH":
      return String(observed ?? "").endsWith(
        String(condition.value ?? ""),
      );
    case "IN":
      return Array.isArray(condition.value)
        ? condition.value.includes(observed)
        : false;
    case "NOT_IN":
      return Array.isArray(condition.value)
        ? !condition.value.includes(observed)
        : false;
    case "EXISTS":
      return observed !== undefined && observed !== null;
    case "NOT_EXISTS":
      return observed === undefined || observed === null;
    case "BETWEEN":
      return (
        Number(observed) >= Number(condition.value) &&
        Number(observed) <= Number(condition.secondValue)
      );
    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  payload: Record<string, unknown>,
): {
  matched: boolean;
  trace: unknown;
} {
  const childResults = group.children.map((child) => {
    if (child.kind === "group") {
      return evaluateConditionGroup(child, payload);
    }

    const matched = evaluateLeaf(child, payload);

    return {
      matched,
      trace: {
        id: child.id,
        kind: child.kind,
        field: child.field,
        operator: child.operator,
        observed: getPath(payload, child.field),
        expected: child.value,
        secondValue: child.secondValue,
        matched,
      },
    };
  });

  const matched =
    group.combinator === "AND"
      ? childResults.every((item) => item.matched)
      : childResults.some((item) => item.matched);

  return {
    matched,
    trace: {
      id: group.id,
      kind: "group",
      combinator: group.combinator,
      matched,
      children: childResults.map((item) => item.trace),
    },
  };
}

export function simulateDesignerState(
  state: AutomationDesignerState,
  payload: Record<string, unknown>,
) {
  const condition = evaluateConditionGroup(
    state.conditions,
    payload,
  );

  return {
    matched: condition.matched,
    conditionTrace: condition.trace,
    actionPreview: condition.matched
      ? state.actions.map((action, index) => ({
          sequence: index + 1,
          actionType: action.actionType,
          configuration: action.configuration,
        }))
      : [],
  };
}
