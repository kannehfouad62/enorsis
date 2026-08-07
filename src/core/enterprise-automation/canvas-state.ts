import type { AutomationCanvasGraph } from "./graph-types";
import type { AutomationDesignerState } from "./designer-types";

export type CanvasDesignerState = AutomationDesignerState & {
  canvasGraph?: AutomationCanvasGraph;
};

export function defaultAutomationCanvasGraph(): AutomationCanvasGraph {
  return {
    version: 1,
    nodes: [
      {
        id: "trigger-1",
        type: "TRIGGER",
        label: "Manual Trigger",
        x: 120,
        y: 180,
        configuration: {
          triggerType: "MANUAL",
        },
      },
      {
        id: "end-1",
        type: "END",
        label: "End",
        x: 620,
        y: 180,
        configuration: {},
      },
    ],
    edges: [
      {
        id: "edge-trigger-end",
        source: "trigger-1",
        target: "end-1",
      },
    ],
  };
}
