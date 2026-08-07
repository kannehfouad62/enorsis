"use client";

import type { AutomationCanvasGraph } from "@/core/enterprise-automation/graph-types";

export function WorkflowMiniMap({
  graph,
  width = 220,
  height = 130,
}: {
  graph: AutomationCanvasGraph;
  width?: number;
  height?: number;
}) {
  if (graph.nodes.length === 0) return null;

  const minX = Math.min(...graph.nodes.map((node) => node.x));
  const minY = Math.min(...graph.nodes.map((node) => node.y));
  const maxX = Math.max(...graph.nodes.map((node) => node.x + 180));
  const maxY = Math.max(...graph.nodes.map((node) => node.y + 82));

  const sourceWidth = Math.max(1, maxX - minX);
  const sourceHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    (width - 16) / sourceWidth,
    (height - 16) / sourceHeight,
  );

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      style={{ width, height }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {graph.edges.map((edge) => {
          const source = graph.nodes.find(
            (node) => node.id === edge.source,
          );
          const target = graph.nodes.find(
            (node) => node.id === edge.target,
          );
          if (!source || !target) return null;

          const x1 = 8 + (source.x - minX + 90) * scale;
          const y1 = 8 + (source.y - minY + 41) * scale;
          const x2 = 8 + (target.x - minX + 90) * scale;
          const y2 = 8 + (target.y - minY + 41) * scale;

          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-300"
            />
          );
        })}

        {graph.nodes.map((node) => (
          <rect
            key={node.id}
            x={8 + (node.x - minX) * scale}
            y={8 + (node.y - minY) * scale}
            width={Math.max(8, 180 * scale)}
            height={Math.max(5, 82 * scale)}
            rx="2"
            fill="currentColor"
            className={
              node.type === "TRIGGER"
                ? "text-blue-500"
                : node.type === "END"
                  ? "text-slate-700"
                  : node.type === "CONDITION"
                    ? "text-amber-500"
                    : "text-emerald-500"
            }
          />
        ))}
      </svg>
    </div>
  );
}
