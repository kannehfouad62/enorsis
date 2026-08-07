import type {
  AutomationCanvasGraph,
  CompiledAutomationGraph,
} from "./graph-types";
import { validateAutomationCanvasGraph } from "./graph-validation";

export function compileAutomationCanvasGraph(
  graph: AutomationCanvasGraph,
): CompiledAutomationGraph {
  const validation = validateAutomationCanvasGraph(graph);

  if (!validation.valid) {
    throw new Error(
      `Workflow graph is invalid: ${validation.issues
        .filter((issue) => issue.severity === "ERROR")
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }

  const trigger = graph.nodes.find(
    (node) => node.type === "TRIGGER",
  );

  if (!trigger) {
    throw new Error("Workflow graph has no trigger.");
  }

  const nodes: CompiledAutomationGraph["nodes"] = {};

  for (const node of graph.nodes) {
    nodes[node.id] = {
      ...node,
      incoming: [],
      outgoing: [],
    };
  }

  for (const edge of graph.edges) {
    nodes[edge.source].outgoing.push({
      target: edge.target,
      label: edge.label ?? null,
    });
    nodes[edge.target].incoming.push(edge.source);
  }

  const indegree = new Map(
    Object.values(nodes).map((node) => [
      node.id,
      node.incoming.length,
    ]),
  );

  const queue = Object.values(nodes)
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const executionOrder: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    executionOrder.push(nodeId);

    for (const edge of nodes[nodeId].outgoing) {
      const next = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }

  return {
    entryNodeId: trigger.id,
    terminalNodeIds: Object.values(nodes)
      .filter(
        (node) =>
          node.type === "END" ||
          node.outgoing.length === 0,
      )
      .map((node) => node.id),
    executionOrder,
    nodes,
  };
}
