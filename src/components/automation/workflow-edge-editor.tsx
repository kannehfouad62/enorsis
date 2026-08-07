"use client";

import type { AutomationCanvasGraph } from "@/core/enterprise-automation/graph-types";
import {
  removeAutomationEdge,
  updateAutomationEdge,
} from "@/core/enterprise-automation/edge-utils";

export function WorkflowEdgeEditor({
  graph,
  edgeId,
  onChange,
  onClose,
}: {
  graph: AutomationCanvasGraph;
  edgeId: string;
  onChange: (graph: AutomationCanvasGraph) => void;
  onClose: () => void;
}) {
  const edge = graph.edges.find((item) => item.id === edgeId);

  if (!edge) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="text-xs font-black uppercase text-slate-500">
        Edge
      </p>

      <input
        value={edge.label ?? ""}
        onChange={(event) =>
          onChange(
            updateAutomationEdge(graph, edge.id, {
              label: event.target.value || null,
            }),
          )
        }
        placeholder="Branch label"
        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(removeAutomationEdge(graph, edge.id));
            onClose();
          }}
          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700"
        >
          Delete edge
        </button>
      </div>
    </div>
  );
}
