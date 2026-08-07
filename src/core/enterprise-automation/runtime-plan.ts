import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "./graph-types";
import { compileAutomationCanvasGraph } from "./graph-compiler";

export type AutomationRuntimeInstruction = {
  nodeId: string;
  type: AutomationCanvasNode["type"];
  label: string;
  configuration: Record<string, unknown>;
  next: Array<{
    target: string;
    label?: string | null;
  }>;
  runtimePolicy: {
    mode: "SEQUENTIAL" | "PARALLEL" | "CONTROL";
    retryCount: number;
    timeoutMinutes?: number;
    waitMinutes?: number;
  };
};

export type AutomationRuntimePlan = {
  entryNodeId: string;
  terminalNodeIds: string[];
  instructions: AutomationRuntimeInstruction[];
};

function runtimePolicy(node: AutomationCanvasNode) {
  if (node.type === "PARALLEL") {
    return {
      mode: "PARALLEL" as const,
      retryCount: 0,
    };
  }

  if (node.type === "RETRY") {
    return {
      mode: "CONTROL" as const,
      retryCount: Math.max(
        1,
        Number(node.configuration.maxAttempts ?? 3),
      ),
    };
  }

  if (node.type === "TIMEOUT") {
    return {
      mode: "CONTROL" as const,
      retryCount: 0,
      timeoutMinutes: Math.max(
        1,
        Number(node.configuration.timeoutMinutes ?? 60),
      ),
    };
  }

  if (node.type === "WAIT") {
    return {
      mode: "CONTROL" as const,
      retryCount: 0,
      waitMinutes: Math.max(
        1,
        Number(node.configuration.durationMinutes ?? 60),
      ),
    };
  }

  return {
    mode: "SEQUENTIAL" as const,
    retryCount: 0,
  };
}

export function compileAutomationRuntimePlan(
  graph: AutomationCanvasGraph,
): AutomationRuntimePlan {
  const compiled = compileAutomationCanvasGraph(graph);

  return {
    entryNodeId: compiled.entryNodeId,
    terminalNodeIds: compiled.terminalNodeIds,
    instructions: compiled.executionOrder.map((nodeId) => {
      const node = compiled.nodes[nodeId];

      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        configuration: node.configuration,
        next: node.outgoing,
        runtimePolicy: runtimePolicy(node),
      };
    }),
  };
}
