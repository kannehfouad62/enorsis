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

export function evaluateAutomationCondition(
  payload: Record<string, unknown>,
  expression: unknown,
) {
  if (
    !expression ||
    typeof expression !== "object" ||
    Array.isArray(expression)
  ) {
    return true;
  }

  const condition = expression as {
    field?: string;
    operator?: string;
    value?: unknown;
  };

  if (!condition.field || !condition.operator) return true;

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
    case "IN":
      return Array.isArray(condition.value)
        ? condition.value.includes(observed)
        : false;
    case "EXISTS":
      return observed !== undefined && observed !== null;
    default:
      return false;
  }
}
