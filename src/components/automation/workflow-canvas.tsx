"use client";

import { useMemo, useRef, useState } from "react";
import type {
  AutomationCanvasEdge,
  AutomationCanvasGraph,
  AutomationCanvasNode,
  AutomationCanvasNodeType,
} from "@/core/enterprise-automation/graph-types";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 82;

const nodeTypes: Array<{
  type: AutomationCanvasNodeType;
  label: string;
}> = [
  { type: "TRIGGER", label: "Trigger" },
  { type: "CONDITION", label: "Condition" },
  { type: "ACTION", label: "Action" },
  { type: "WAIT", label: "Wait" },
  { type: "APPROVAL", label: "Approval" },
  { type: "PARALLEL", label: "Parallel" },
  { type: "RETRY", label: "Retry" },
  { type: "TIMEOUT", label: "Timeout" },
  { type: "END", label: "End" },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function WorkflowCanvas({
  graph,
  onChange,
  selectedNodeId,
  onSelectNode,
}: {
  graph: AutomationCanvasGraph;
  onChange: (graph: AutomationCanvasGraph) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(
    null,
  );

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );

  const addNode = (type: AutomationCanvasNodeType) => {
    const count = graph.nodes.filter(
      (node) => node.type === type,
    ).length;

    const node: AutomationCanvasNode = {
      id: uid(type.toLowerCase()),
      type,
      label: `${type[0]}${type.slice(1).toLowerCase()} ${count + 1}`,
      x: 260 + count * 24,
      y: 140 + count * 110,
      configuration:
        type === "TRIGGER"
          ? { triggerType: "DOMAIN_EVENT" }
          : type === "CONDITION"
            ? {
                field: "",
                operator: "EQ",
                value: "",
              }
            : type === "ACTION"
              ? { actionType: "PUBLISH_EVENT" }
              : type === "WAIT"
                ? { durationMinutes: 60 }
                : type === "RETRY"
                  ? { maxAttempts: 3, delayMinutes: 5 }
                  : type === "TIMEOUT"
                    ? { timeoutMinutes: 60 }
                    : {},
    };

    onChange({
      ...graph,
      nodes: [...graph.nodes, node],
    });
    onSelectNode(node.id);
  };

  const removeNode = (nodeId: string) => {
    onChange({
      ...graph,
      nodes: graph.nodes.filter((node) => node.id !== nodeId),
      edges: graph.edges.filter(
        (edge) =>
          edge.source !== nodeId && edge.target !== nodeId,
      ),
    });
    if (selectedNodeId === nodeId) onSelectNode(null);
  };

  const connect = (targetId: string) => {
    if (!connectFrom || connectFrom === targetId) {
      setConnectFrom(null);
      return;
    }

    const duplicate = graph.edges.some(
      (edge) =>
        edge.source === connectFrom &&
        edge.target === targetId,
    );

    if (!duplicate) {
      const edge: AutomationCanvasEdge = {
        id: uid("edge"),
        source: connectFrom,
        target: targetId,
        label:
          nodeMap.get(connectFrom)?.type === "CONDITION"
            ? "TRUE"
            : null,
      };

      onChange({
        ...graph,
        edges: [...graph.edges, edge],
      });
    }

    setConnectFrom(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[190px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase text-slate-500">
          Node Library
        </p>
        <div className="mt-3 space-y-2">
          {nodeTypes.map((node) => (
            <button
              key={node.type}
              type="button"
              onClick={() => addNode(node.type)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-black hover:bg-slate-50"
            >
              + {node.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          Click Connect on a node, then click the destination
          node.
        </p>
      </aside>

      <div
        ref={canvasRef}
        className="relative min-h-[620px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
        onPointerMove={(event) => {
          if (!dragging || !canvasRef.current) return;

          const bounds =
            canvasRef.current.getBoundingClientRect();

          const x =
            event.clientX -
            bounds.left -
            dragging.offsetX;
          const y =
            event.clientY -
            bounds.top -
            dragging.offsetY;

          onChange({
            ...graph,
            nodes: graph.nodes.map((node) =>
              node.id === dragging.nodeId
                ? {
                    ...node,
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                  }
                : node,
            ),
          });
        }}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
            </marker>
          </defs>

          {graph.edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const x1 = source.x + NODE_WIDTH;
            const y1 = source.y + NODE_HEIGHT / 2;
            const x2 = target.x;
            const y2 = target.y + NODE_HEIGHT / 2;
            const mid = (x1 + x2) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="text-slate-400"
                />
                {edge.label ? (
                  <text
                    x={mid}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fontSize="11"
                    className="fill-slate-600"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {graph.nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => {
              if (connectFrom) {
                connect(node.id);
              } else {
                onSelectNode(node.id);
              }
            }}
            onPointerDown={(event) => {
              const rect =
                event.currentTarget.getBoundingClientRect();

              setDragging({
                nodeId: node.id,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
              });
            }}
            style={{
              width: NODE_WIDTH,
              minHeight: NODE_HEIGHT,
              transform: `translate(${node.x}px, ${node.y}px)`,
            }}
            className={`absolute cursor-move select-none rounded-2xl border bg-white p-4 shadow-sm ${
              selectedNodeId === node.id
                ? "border-blue-600 ring-2 ring-blue-100"
                : connectFrom === node.id
                  ? "border-violet-600 ring-2 ring-violet-100"
                  : "border-slate-200"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              {node.type}
            </p>
            <p className="mt-1 truncate text-sm font-black">
              {node.label}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setConnectFrom(node.id);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black"
              >
                Connect
              </button>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  removeNode(node.id);
                }}
                className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-black text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
