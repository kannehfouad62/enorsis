import type { AutomationCanvasGraph, AutomationCanvasNode } from "./graph-types";

export function durableRetryPolicy(node: AutomationCanvasNode) {
  return {
    maxAttempts: Math.min(10, Math.max(1, Number(node.configuration.maxAttempts ?? 1))),
    delayMinutes: Math.max(0, Number(node.configuration.delayMinutes ?? 0)),
    backoffMultiplier: Math.max(1, Number(node.configuration.backoffMultiplier ?? 1)),
  };
}

export function retryDelayForAttempt(
  policy: ReturnType<typeof durableRetryPolicy>,
  attemptCount: number,
) {
  if (policy.delayMinutes <= 0) return 0;
  return Math.round(
    policy.delayMinutes * Math.pow(policy.backoffMultiplier, Math.max(0, attemptCount - 1)),
  );
}

export function timeoutAtForNode(node: AutomationCanvasNode, startedAt: Date) {
  const timeoutMinutes = Math.max(0, Number(node.configuration.timeoutMinutes ?? 0));
  return timeoutMinutes
    ? new Date(startedAt.getTime() + timeoutMinutes * 60_000)
    : null;
}

export function incomingNodeIds(graph: AutomationCanvasGraph, nodeId: string) {
  return graph.edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
}
