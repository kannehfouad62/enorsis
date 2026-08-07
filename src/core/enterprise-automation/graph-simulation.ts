import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
  CompiledAutomationNode,
} from "./graph-types";
import { compileAutomationCanvasGraph } from "./graph-compiler";

type CompiledAutomationEdge =
  CompiledAutomationNode["outgoing"][number];

function path(
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

function conditionMatched(
  node: AutomationCanvasNode,
  payload: Record<string, unknown>,
): boolean {
  const field = String(node.configuration.field ?? "");
  const operator = String(node.configuration.operator ?? "EQ");
  const expected = node.configuration.value;
  const observed = path(payload, field);

  if (operator === "EQ") return observed === expected;
  if (operator === "NEQ") return observed !== expected;
  if (operator === "GT") {
    return Number(observed) > Number(expected);
  }
  if (operator === "GTE") {
    return Number(observed) >= Number(expected);
  }
  if (operator === "LT") {
    return Number(observed) < Number(expected);
  }
  if (operator === "LTE") {
    return Number(observed) <= Number(expected);
  }
  if (operator === "EXISTS") {
    return observed !== undefined && observed !== null;
  }

  return false;
}

export function simulateAutomationCanvasGraph(
  graph: AutomationCanvasGraph,
  payload: Record<string, unknown>,
) {
  const compiled = compileAutomationCanvasGraph(graph);
  const trace: Array<Record<string, unknown>> = [];

  let currentId: string | undefined = compiled.entryNodeId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error(
        "Simulation encountered an unexpected cycle.",
      );
    }

    visited.add(currentId);

    const node: CompiledAutomationNode | undefined =
      compiled.nodes[currentId];

    if (!node) {
      break;
    }

    if (node.type === "CONDITION") {
      const matched = conditionMatched(node, payload);

      trace.push({
        nodeId: node.id,
        type: node.type,
        label: node.label,
        result: matched,
      });

      const preferredLabel = matched ? "TRUE" : "FALSE";

      const branch: CompiledAutomationEdge | undefined =
        node.outgoing.find(
          (edge: CompiledAutomationEdge) =>
            String(edge.label ?? "").toUpperCase() ===
            preferredLabel,
        ) ?? node.outgoing[matched ? 0 : 1];

      currentId = branch?.target;
      continue;
    }

    trace.push({
      nodeId: node.id,
      type: node.type,
      label: node.label,
      configuration: node.configuration,
      result:
        node.type === "END"
          ? "COMPLETED"
          : "PREVIEW",
    });

    const nextEdge: CompiledAutomationEdge | undefined =
      node.outgoing[0];

    currentId = nextEdge?.target;
  }

  return {
    entryNodeId: compiled.entryNodeId,
    completed: trace.some(
      (item) => item.type === "END",
    ),
    trace,
  };
}