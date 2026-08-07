"use client";

import { useMemo, useState } from "react";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowInspector } from "./workflow-inspector";
import { WorkflowMiniMap } from "./workflow-minimap";
import { WorkflowToolbar } from "./workflow-toolbar";
import { WorkflowEdgeEditor } from "./workflow-edge-editor";
import type { AutomationCanvasGraph } from "@/core/enterprise-automation/graph-types";
import {
  defaultAutomationCanvasGraph,
  type CanvasDesignerState,
} from "@/core/enterprise-automation/canvas-state";
import { validateAutomationCanvasGraph } from "@/core/enterprise-automation/graph-validation";
import { simulateAutomationCanvasGraph } from "@/core/enterprise-automation/graph-simulation";
import { compileAutomationRuntimePlan } from "@/core/enterprise-automation/runtime-plan";
import { executeAutomationRuntimeGraph } from "@/core/enterprise-automation/runtime-executor";
import { normalizeAutomationCanvasViewport } from "@/core/enterprise-automation/viewport";
import { saveAutomationDesignerVersionAction } from "@/modules/enterprise-automation/designer-actions";

export function VisualWorkflowDesigner({
  ruleId,
  initialState,
}: {
  ruleId: string;
  initialState: CanvasDesignerState | null;
}) {
  const initialGraph =
    initialState?.canvasGraph ??
    defaultAutomationCanvasGraph();

  const [history, setHistory] = useState<AutomationCanvasGraph[]>([
    initialGraph,
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const graph = history[historyIndex];

  const initialViewport = normalizeAutomationCanvasViewport(
    initialState?.canvasViewport,
  );

  const [zoom, setZoom] = useState(initialViewport.zoom);
  const [pan, setPan] = useState({
    x: initialViewport.panX,
    y: initialViewport.panY,
  });
  
  const [selectedEdgeId, setSelectedEdgeId] =
    useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);
  const [payloadText, setPayloadText] = useState(
    '{\n  "amount": "125000",\n  "riskLevel": "HIGH"\n}',
  );
  const [simulation, setSimulation] =
    useState<ReturnType<
      typeof simulateAutomationCanvasGraph
    > | null>(null);

  const [runtimeExecution, setRuntimeExecution] =
    useState<Awaited<
      ReturnType<typeof executeAutomationRuntimeGraph>
    > | null>(null);

  const validation = useMemo(
    () => validateAutomationCanvasGraph(graph),
    [graph],
  );

  const runtimePlan = useMemo(() => {
    if (!validation.valid) return null;
    try {
      return compileAutomationRuntimePlan(graph);
    } catch {
      return null;
    }
  }, [graph, validation.valid]);

  const commitGraph = (next: AutomationCanvasGraph) => {
    if (JSON.stringify(next) === JSON.stringify(graph)) return;

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(next);

    const bounded =
      nextHistory.length > 60
        ? nextHistory.slice(nextHistory.length - 60)
        : nextHistory;

    setHistory(bounded);
    setHistoryIndex(bounded.length - 1);
  };

  const selectedNode =
    graph.nodes.find((node) => node.id === selectedNodeId) ??
    null;

  const designerState: CanvasDesignerState = {
    ...(initialState ?? {
      trigger: { triggerType: "MANUAL" },
      conditions: {
        id: "root",
        kind: "group",
        combinator: "AND",
        children: [],
      },
      actions: [],
    }),
    canvasGraph: graph,
    canvasViewport: {
      zoom,
      panX: pan.x,
      panY: pan.y,
    },
  };

  return (
    <div className="space-y-6">
      <WorkflowToolbar
        zoom={zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={() =>
          setHistoryIndex((current) => Math.max(0, current - 1))
        }
        onRedo={() =>
          setHistoryIndex((current) =>
            Math.min(history.length - 1, current + 1),
          )
        }
        onZoomIn={() =>
          setZoom((current) =>
            Math.min(2, Number((current + 0.1).toFixed(2))),
          )
        }
        onZoomOut={() =>
          setZoom((current) =>
            Math.max(0.4, Number((current - 0.1).toFixed(2))),
          )
        }
        onResetView={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
      />

      <div className="grid gap-4 2xl:grid-cols-[1fr_300px]">
      <WorkflowCanvas
  graph={graph}
  onChange={commitGraph}
  selectedNodeId={selectedNodeId}
  onSelectNode={setSelectedNodeId}
  zoom={zoom}
  pan={pan}
  onPanChange={setPan}
  selectedEdgeId={selectedEdgeId}
  onSelectEdge={setSelectedEdgeId}
/>

        <div className="space-y-4">
          <WorkflowInspector
            graph={graph}
            node={selectedNode}
            onChange={commitGraph}
          />

          {selectedEdgeId ? (
            <WorkflowEdgeEditor
              graph={graph}
              edgeId={selectedEdgeId}
              onChange={commitGraph}
              onClose={() => setSelectedEdgeId(null)}
            />
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-slate-500">
                Validation
              </p>
              <span
                className={`text-xs font-black ${
                  validation.valid
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {validation.valid ? "VALID" : "INVALID"}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {validation.issues.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No graph issues detected.
                </p>
              ) : (
                validation.issues.map((issue, index) => (
                  <div
                    key={`${issue.code}-${index}`}
                    className="rounded-xl bg-slate-50 p-3 text-xs"
                  >
                    <p className="font-black">
                      {issue.severity} · {issue.code}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {issue.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase text-slate-500">
              Runtime Plan
            </p>
            {runtimePlan ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500">
                  {runtimePlan.instructions.length} instructions ·{" "}
                  {runtimePlan.terminalNodeIds.length} terminal path(s)
                </p>
                {runtimePlan.instructions.slice(0, 8).map(
                  (instruction, index) => (
                    <div
                      key={instruction.nodeId}
                      className="rounded-xl bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-black">
                        {index + 1}. {instruction.label}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {instruction.type} ·{" "}
                        {instruction.runtimePolicy.mode}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Resolve validation errors to compile the runtime plan.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase text-slate-500">
              Simulation
            </p>
            <textarea
              value={payloadText}
              onChange={(event) =>
                setPayloadText(event.target.value)
              }
              className="mt-3 min-h-32 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
            />
            <button
              type="button"
              disabled={!validation.valid}
              onClick={() => {
                const payload = JSON.parse(
                  payloadText,
                ) as Record<string, unknown>;
                setSimulation(
                  simulateAutomationCanvasGraph(
                    graph,
                    payload,
                  ),
                );
              }}
              className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              Preview execution
            </button>

            <button
              type="button"
              disabled={!validation.valid}
              onClick={async () => {
                const payload = JSON.parse(
                  payloadText,
                ) as Record<string, unknown>;

                setRuntimeExecution(
                  await executeAutomationRuntimeGraph({
                    graph,
                    payload,
                  }),
                );
              }}
              className="mt-3 ml-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40"
            >
              Execute runtime preview
            </button>

            {runtimeExecution ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-black">
                  Runtime:{" "}
                  {runtimeExecution.failed
                    ? "FAILED"
                    : runtimeExecution.waiting
                      ? "WAITING"
                      : runtimeExecution.completed
                        ? "COMPLETED"
                        : "PARTIAL"}
                </p>
                <p className="mt-1 text-slate-500">
                  {runtimeExecution.results.length} node result(s)
                </p>
              </div>
            ) : null}

            {simulation ? (
              <div className="mt-4 space-y-2">
                {simulation.trace.map((item, index) => (
                  <div
                    key={`${String(item.nodeId)}-${index}`}
                    className="rounded-xl bg-slate-50 p-3 text-xs"
                  >
                    <p className="font-black">
                      {index + 1}. {String(item.label)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {String(item.type)} ·{" "}
                      {String(item.result)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <WorkflowMiniMap graph={graph} />

      <form action={saveAutomationDesignerVersionAction}>
        <input type="hidden" name="ruleId" value={ruleId} />
        <input
          type="hidden"
          name="designerState"
          value={JSON.stringify(designerState)}
        />
        <input
          name="changeSummary"
          placeholder="Canvas version change summary"
          className="mr-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          disabled={!validation.valid}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          Save validated canvas version
        </button>
      </form>
    </div>
  );
}
