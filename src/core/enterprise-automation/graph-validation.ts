import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "./graph-types";

export type GraphValidationIssue = {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

function reachableFrom(
  start: string,
  adjacency: Map<string, string[]>,
) {
  const visited = new Set<string>();
  const queue = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return visited;
}

function detectCycle(
  nodeIds: string[],
  adjacency: Map<string, string[]>,
) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visiting.add(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) {
      if (visit(next)) return true;
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return nodeIds.some((nodeId) => visit(nodeId));
}

function validateNodeConfiguration(
  node: AutomationCanvasNode,
  issues: GraphValidationIssue[],
) {
  if (node.type === "TRIGGER") {
    const triggerType = String(
      node.configuration.triggerType ?? "",
    );

    if (!triggerType) {
      issues.push({
        severity: "ERROR",
        code: "TRIGGER_TYPE_REQUIRED",
        message: "Trigger node requires triggerType.",
        nodeId: node.id,
      });
    }
  }

  if (node.type === "CONDITION") {
    if (!node.configuration.field) {
      issues.push({
        severity: "ERROR",
        code: "CONDITION_FIELD_REQUIRED",
        message: "Condition node requires a field.",
        nodeId: node.id,
      });
    }

    if (!node.configuration.operator) {
      issues.push({
        severity: "ERROR",
        code: "CONDITION_OPERATOR_REQUIRED",
        message: "Condition node requires an operator.",
        nodeId: node.id,
      });
    }
  }

  if (node.type === "ACTION") {
    if (!node.configuration.actionType) {
      issues.push({
        severity: "ERROR",
        code: "ACTION_TYPE_REQUIRED",
        message: "Action node requires an action type.",
        nodeId: node.id,
      });
    }
  }

  if (node.type === "WAIT") {
    const durationMinutes = Number(
      node.configuration.durationMinutes ?? 0,
    );

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      issues.push({
        severity: "ERROR",
        code: "WAIT_DURATION_INVALID",
        message: "Wait node requires durationMinutes greater than zero.",
        nodeId: node.id,
      });
    }
  }
}

export function validateAutomationCanvasGraph(
  graph: AutomationCanvasGraph,
) {
  const issues: GraphValidationIssue[] = [];

  if (graph.nodes.length === 0) {
    issues.push({
      severity: "ERROR",
      code: "EMPTY_GRAPH",
      message: "Workflow graph contains no nodes.",
    });
    return { valid: false, issues };
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  if (nodeIds.size !== graph.nodes.length) {
    issues.push({
      severity: "ERROR",
      code: "DUPLICATE_NODE_ID",
      message: "Workflow graph contains duplicate node IDs.",
    });
  }

  const triggers = graph.nodes.filter(
    (node) => node.type === "TRIGGER",
  );

  if (triggers.length !== 1) {
    issues.push({
      severity: "ERROR",
      code: "SINGLE_TRIGGER_REQUIRED",
      message: `Workflow requires exactly one trigger node; found ${triggers.length}.`,
    });
  }

  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    incoming.set(node.id, 0);
    validateNodeConfiguration(node, issues);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        severity: "ERROR",
        code: "ORPHAN_EDGE",
        message: "Connection references a missing node.",
        edgeId: edge.id,
      });
      continue;
    }

    if (edge.source === edge.target) {
      issues.push({
        severity: "ERROR",
        code: "SELF_LOOP",
        message: "Node cannot connect to itself.",
        edgeId: edge.id,
      });
    }

    adjacency.get(edge.source)?.push(edge.target);
    incoming.set(
      edge.target,
      (incoming.get(edge.target) ?? 0) + 1,
    );
  }

  if (detectCycle([...nodeIds], adjacency)) {
    issues.push({
      severity: "ERROR",
      code: "CYCLE_DETECTED",
      message:
        "Circular workflow reference detected. Loops require a governed loop node in a later runtime phase.",
    });
  }

  if (triggers.length === 1) {
    const reachable = reachableFrom(
      triggers[0].id,
      adjacency,
    );

    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          severity: "ERROR",
          code: "UNREACHABLE_NODE",
          message: `${node.label} is unreachable from the trigger.`,
          nodeId: node.id,
        });
      }
    }
  }

  for (const node of graph.nodes) {
    const outgoing = adjacency.get(node.id) ?? [];

    if (
      node.type !== "END" &&
      outgoing.length === 0
    ) {
      issues.push({
        severity: "WARNING",
        code: "DEAD_END",
        message: `${node.label} has no outgoing connection.`,
        nodeId: node.id,
      });
    }

    if (
      node.type === "CONDITION" &&
      outgoing.length !== 2
    ) {
      issues.push({
        severity: "WARNING",
        code: "CONDITION_BRANCH_COUNT",
        message:
          "Condition nodes should normally have exactly two branches.",
        nodeId: node.id,
      });
    }

    if (
      node.type !== "TRIGGER" &&
      (incoming.get(node.id) ?? 0) === 0
    ) {
      issues.push({
        severity: "WARNING",
        code: "NO_INCOMING_EDGE",
        message: `${node.label} has no incoming connection.`,
        nodeId: node.id,
      });
    }
  }

  return {
    valid: !issues.some(
      (issue) => issue.severity === "ERROR",
    ),
    issues,
  };
}
