import type { AutomationCanvasGraph } from "./graph-types";

export function diffAutomationCanvasGraphs(
  before: AutomationCanvasGraph,
  after: AutomationCanvasGraph,
) {
  const beforeNodes = new Map(
    before.nodes.map((node) => [node.id, node]),
  );
  const afterNodes = new Map(
    after.nodes.map((node) => [node.id, node]),
  );
  const beforeEdges = new Map(
    before.edges.map((edge) => [edge.id, edge]),
  );
  const afterEdges = new Map(
    after.edges.map((edge) => [edge.id, edge]),
  );

  const addedNodes = after.nodes.filter(
    (node) => !beforeNodes.has(node.id),
  );
  const removedNodes = before.nodes.filter(
    (node) => !afterNodes.has(node.id),
  );
  const changedNodes = after.nodes.filter((node) => {
    const previous = beforeNodes.get(node.id);
    return (
      previous &&
      JSON.stringify(previous) !== JSON.stringify(node)
    );
  });

  const addedEdges = after.edges.filter(
    (edge) => !beforeEdges.has(edge.id),
  );
  const removedEdges = before.edges.filter(
    (edge) => !afterEdges.has(edge.id),
  );

  return {
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    changed:
      addedNodes.length +
        removedNodes.length +
        changedNodes.length +
        addedEdges.length +
        removedEdges.length >
      0,
  };
}
