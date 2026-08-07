import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "./graph-types";
import { compileAutomationRuntimePlan } from "./runtime-plan";

export type RuntimeNodeResult = {
  nodeId: string;
  type: AutomationCanvasNode["type"];
  status: "COMPLETED" | "SKIPPED" | "FAILED" | "WAITING";
  attempt: number;
  startedAt: string;
  completedAt?: string;
  detail?: Record<string, unknown>;
};

export type RuntimeExecutionResult = {
  entryNodeId: string;
  completed: boolean;
  waiting: boolean;
  failed: boolean;
  results: RuntimeNodeResult[];
};

type RuntimeHooks = {
  executeAction?: (
    node: AutomationCanvasNode,
    payload: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | void>;
  executeApproval?: (
    node: AutomationCanvasNode,
    payload: Record<string, unknown>,
  ) => Promise<"APPROVED" | "REJECTED" | "PENDING">;
};

function readPath(
  value: Record<string, unknown>,
  key: string,
): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
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

function evaluateCondition(
  node: AutomationCanvasNode,
  payload: Record<string, unknown>,
) {
  const field = String(node.configuration.field ?? "");
  const operator = String(node.configuration.operator ?? "EQ");
  const expected = node.configuration.value;
  const observed = readPath(payload, field);

  if (operator === "EQ") return observed === expected;
  if (operator === "NEQ") return observed !== expected;
  if (operator === "GT") return Number(observed) > Number(expected);
  if (operator === "GTE") return Number(observed) >= Number(expected);
  if (operator === "LT") return Number(observed) < Number(expected);
  if (operator === "LTE") return Number(observed) <= Number(expected);
  if (operator === "EXISTS") {
    return observed !== undefined && observed !== null;
  }

  return false;
}

async function executeNodeWithRetry(input: {
  node: AutomationCanvasNode;
  payload: Record<string, unknown>;
  hooks: RuntimeHooks;
  maxAttempts: number;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= input.maxAttempts; attempt += 1) {
    try {
      const detail =
        input.node.type === "ACTION"
          ? await input.hooks.executeAction?.(
              input.node,
              input.payload,
            )
          : undefined;

      return {
        attempt,
        detail: detail ?? {},
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Automation node execution failed.");
}

export async function executeAutomationRuntimeGraph(input: {
  graph: AutomationCanvasGraph;
  payload: Record<string, unknown>;
  hooks?: RuntimeHooks;
}): Promise<RuntimeExecutionResult> {
  const hooks = input.hooks ?? {};
  const plan = compileAutomationRuntimePlan(input.graph);
  const nodes = new Map(
    input.graph.nodes.map((node) => [node.id, node]),
  );
  const instructions = new Map(
    plan.instructions.map((instruction) => [
      instruction.nodeId,
      instruction,
    ]),
  );

  const results: RuntimeNodeResult[] = [];
  const visited = new Set<string>();
  const queue: string[] = [plan.entryNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId);
    const instruction = instructions.get(nodeId);

    if (!node || !instruction) continue;
    if (visited.has(nodeId) && node.type !== "PARALLEL") continue;
    visited.add(nodeId);

    const startedAt = new Date().toISOString();

    if (node.type === "END") {
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
      });
      continue;
    }

    if (node.type === "WAIT") {
      results.push({
        nodeId,
        type: node.type,
        status: "WAITING",
        attempt: 1,
        startedAt,
        detail: {
          waitMinutes:
            instruction.runtimePolicy.waitMinutes ?? 0,
        },
      });

      return {
        entryNodeId: plan.entryNodeId,
        completed: false,
        waiting: true,
        failed: false,
        results,
      };
    }

    if (node.type === "TIMEOUT") {
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: {
          timeoutMinutes:
            instruction.runtimePolicy.timeoutMinutes ?? 0,
        },
      });

      for (const next of instruction.next) {
        queue.push(next.target);
      }
      continue;
    }

    if (node.type === "CONDITION") {
      const matched = evaluateCondition(node, input.payload);
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: { matched },
      });

      const preferred = matched ? "TRUE" : "FALSE";
      const branch =
        instruction.next.find(
          (edge) =>
            String(edge.label ?? "").toUpperCase() === preferred,
        ) ?? instruction.next[matched ? 0 : 1];

      if (branch) queue.push(branch.target);
      continue;
    }

    if (node.type === "PARALLEL") {
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: {
          branches: instruction.next.map((edge) => ({
            target: edge.target,
            label: edge.label ?? null,
          })),
        },
      });

      for (const branch of instruction.next) {
        queue.push(branch.target);
      }
      continue;
    }

    if (node.type === "APPROVAL") {
      const decision =
        (await hooks.executeApproval?.(
          node,
          input.payload,
        )) ?? "PENDING";

      results.push({
        nodeId,
        type: node.type,
        status:
          decision === "PENDING"
            ? "WAITING"
            : "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt:
          decision === "PENDING"
            ? undefined
            : new Date().toISOString(),
        detail: { decision },
      });

      if (decision === "PENDING") {
        return {
          entryNodeId: plan.entryNodeId,
          completed: false,
          waiting: true,
          failed: false,
          results,
        };
      }

      const branch =
        instruction.next.find(
          (edge) =>
            String(edge.label ?? "").toUpperCase() === decision,
        ) ?? instruction.next[0];

      if (branch) queue.push(branch.target);
      continue;
    }

    try {
      const maxAttempts =
        node.type === "RETRY"
          ? Math.max(
              1,
              Number(node.configuration.maxAttempts ?? 3),
            )
          : Math.max(
              1,
              instruction.runtimePolicy.retryCount || 1,
            );

      const execution = await executeNodeWithRetry({
        node,
        payload: input.payload,
        hooks,
        maxAttempts,
      });

      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: execution.attempt,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: execution.detail,
      });

      for (const next of instruction.next) {
        queue.push(next.target);
      }
    } catch (error) {
      results.push({
        nodeId,
        type: node.type,
        status: "FAILED",
        attempt: Math.max(
          1,
          Number(node.configuration.maxAttempts ?? 1),
        ),
        startedAt,
        completedAt: new Date().toISOString(),
        detail: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown runtime execution failure.",
        },
      });

      return {
        entryNodeId: plan.entryNodeId,
        completed: false,
        waiting: false,
        failed: true,
        results,
      };
    }
  }

  return {
    entryNodeId: plan.entryNodeId,
    completed: results.some(
      (result) =>
        result.type === "END" &&
        result.status === "COMPLETED",
    ),
    waiting: false,
    failed: false,
    results,
  };
}
