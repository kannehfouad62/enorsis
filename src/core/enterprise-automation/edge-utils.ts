import type {
  AutomationCanvasEdge,
  AutomationCanvasGraph,
} from "./graph-types";

export function updateAutomationEdge(
  graph: AutomationCanvasGraph,
  edgeId: string,
  patch: Partial<AutomationCanvasEdge>,
): AutomationCanvasGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge) =>
      edge.id === edgeId
        ? { ...edge, ...patch }
        : edge,
    ),
  };
}

export function removeAutomationEdge(
  graph: AutomationCanvasGraph,
  edgeId: string,
): AutomationCanvasGraph {
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => edge.id !== edgeId,
    ),
  };
}
