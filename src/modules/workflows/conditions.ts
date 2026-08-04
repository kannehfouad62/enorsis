type Context = Record<string, unknown>;

function getPath(context: Context, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, context);
}

export function evaluateWorkflowCondition(
  expression: unknown,
  context: Context,
): boolean {
  if (!expression) return true;
  if (typeof expression !== "object" || Array.isArray(expression)) return false;

  const item = expression as Record<string, unknown>;

  if (Array.isArray(item.all)) {
    return item.all.every((entry) =>
      evaluateWorkflowCondition(entry, context),
    );
  }

  if (Array.isArray(item.any)) {
    return item.any.some((entry) =>
      evaluateWorkflowCondition(entry, context),
    );
  }

  const field = typeof item.field === "string" ? item.field : "";
  const operator = typeof item.operator === "string" ? item.operator : "eq";
  const actual = getPath(context, field);
  const expected = item.value;

  switch (operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "contains":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? "").includes(String(expected ?? ""));
    default:
      return false;
  }
}
