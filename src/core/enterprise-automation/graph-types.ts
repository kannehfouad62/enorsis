export type AutomationCanvasNodeType =
  | "TRIGGER"
  | "CONDITION"
  | "ACTION"
  | "WAIT"
  | "APPROVAL"
  | "PARALLEL"
  | "JOIN"
  | "RETRY"
  | "TIMEOUT"
  | "END";

export type AutomationCanvasNode = {
  id: string;
  type: AutomationCanvasNodeType;
  label: string;
  x: number;
  y: number;
  configuration: Record<string, unknown>;
};

export type AutomationCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string | null;
};

export type AutomationCanvasGraph = {
  version: 1;
  nodes: AutomationCanvasNode[];
  edges: AutomationCanvasEdge[];
};

export type CompiledAutomationNode = AutomationCanvasNode & {
  incoming: string[];
  outgoing: Array<{
    target: string;
    label?: string | null;
  }>;
};

export type CompiledAutomationGraph = {
  entryNodeId: string;
  terminalNodeIds: string[];
  executionOrder: string[];
  nodes: Record<string, CompiledAutomationNode>;
};
