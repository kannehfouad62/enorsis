from pathlib import Path


def write_runtime_executor() -> None:
    path = Path("src/core/enterprise-automation/runtime-executor.ts")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(r'''import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "./graph-types";
import { compileAutomationRuntimePlan } from "./runtime-plan";

export type RuntimeNodeResult = {
  nodeId: string;
  type: AutomationCanvasNode["type"];
  status: "COMPLETED" | "FAILED" | "WAITING";
  attempt: number;
  startedAt: string;
  completedAt?: string;
  detail?: Record<string, unknown>;
};

export type RuntimeExecutionResult = {
  entryNodeId: string;
  completed: boolean;
  waiting: boolean;
  failed: boolean;
  results: RuntimeNodeResult[];
};

type RuntimeHooks = {
  executeAction?: (
    node: AutomationCanvasNode,
    payload: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | void>;
  executeApproval?: (
    node: AutomationCanvasNode,
    payload: Record<string, unknown>,
  ) => Promise<"APPROVED" | "REJECTED" | "PENDING">;
};

function readPath(
  value: Record<string, unknown>,
  key: string,
): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

function matches(
  node: AutomationCanvasNode,
  payload: Record<string, unknown>,
) {
  const field = String(node.configuration.field ?? "");
  const operator = String(node.configuration.operator ?? "EQ");
  const expected = node.configuration.value;
  const observed = readPath(payload, field);

  if (operator === "EQ") return observed === expected;
  if (operator === "NEQ") return observed !== expected;
  if (operator === "GT") return Number(observed) > Number(expected);
  if (operator === "GTE") return Number(observed) >= Number(expected);
  if (operator === "LT") return Number(observed) < Number(expected);
  if (operator === "LTE") return Number(observed) <= Number(expected);
  if (operator === "EXISTS") {
    return observed !== undefined && observed !== null;
  }
  return false;
}

export async function executeAutomationRuntimeGraph(input: {
  graph: AutomationCanvasGraph;
  payload: Record<string, unknown>;
  hooks?: RuntimeHooks;
}): Promise<RuntimeExecutionResult> {
  const hooks = input.hooks ?? {};
  const plan = compileAutomationRuntimePlan(input.graph);
  const nodes = new Map(input.graph.nodes.map((node) => [node.id, node]));
  const instructions = new Map(
    plan.instructions.map((item) => [item.nodeId, item]),
  );
  const results: RuntimeNodeResult[] = [];
  const visited = new Set<string>();
  const queue = [plan.entryNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId);
    const instruction = instructions.get(nodeId);

    if (!node || !instruction) continue;
    if (visited.has(nodeId) && node.type !== "PARALLEL") continue;
    visited.add(nodeId);

    const startedAt = new Date().toISOString();

    if (node.type === "END") {
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
      });
      continue;
    }

    if (node.type === "WAIT") {
      results.push({
        nodeId,
        type: node.type,
        status: "WAITING",
        attempt: 1,
        startedAt,
        detail: {
          waitMinutes: instruction.runtimePolicy.waitMinutes ?? 0,
        },
      });
      return {
        entryNodeId: plan.entryNodeId,
        completed: false,
        waiting: true,
        failed: false,
        results,
      };
    }

    if (node.type === "CONDITION") {
      const matched = matches(node, input.payload);
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: { matched },
      });

      const preferred = matched ? "TRUE" : "FALSE";
      const branch =
        instruction.next.find(
          (edge) =>
            String(edge.label ?? "").toUpperCase() === preferred,
        ) ?? instruction.next[matched ? 0 : 1];

      if (branch) queue.push(branch.target);
      continue;
    }

    if (node.type === "PARALLEL") {
      results.push({
        nodeId,
        type: node.type,
        status: "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: { branches: instruction.next.length },
      });

      for (const branch of instruction.next) {
        queue.push(branch.target);
      }
      continue;
    }

    if (node.type === "APPROVAL") {
      const decision =
        (await hooks.executeApproval?.(node, input.payload)) ??
        "PENDING";

      results.push({
        nodeId,
        type: node.type,
        status: decision === "PENDING" ? "WAITING" : "COMPLETED",
        attempt: 1,
        startedAt,
        completedAt:
          decision === "PENDING"
            ? undefined
            : new Date().toISOString(),
        detail: { decision },
      });

      if (decision === "PENDING") {
        return {
          entryNodeId: plan.entryNodeId,
          completed: false,
          waiting: true,
          failed: false,
          results,
        };
      }

      const branch =
        instruction.next.find(
          (edge) =>
            String(edge.label ?? "").toUpperCase() === decision,
        ) ?? instruction.next[0];

      if (branch) queue.push(branch.target);
      continue;
    }

    const maxAttempts =
      node.type === "RETRY"
        ? Math.max(1, Number(node.configuration.maxAttempts ?? 3))
        : 1;

    let attempt = 0;
    let detail: Record<string, unknown> | void;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        detail =
          node.type === "ACTION"
            ? await hooks.executeAction?.(node, input.payload)
            : {};
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      results.push({
        nodeId,
        type: node.type,
        status: "FAILED",
        attempt,
        startedAt,
        completedAt: new Date().toISOString(),
        detail: {
          message:
            lastError instanceof Error
              ? lastError.message
              : "Unknown runtime failure.",
        },
      });
      return {
        entryNodeId: plan.entryNodeId,
        completed: false,
        waiting: false,
        failed: true,
        results,
      };
    }

    results.push({
      nodeId,
      type: node.type,
      status: "COMPLETED",
      attempt,
      startedAt,
      completedAt: new Date().toISOString(),
      detail: detail ?? {},
    });

    for (const next of instruction.next) {
      queue.push(next.target);
    }
  }

  return {
    entryNodeId: plan.entryNodeId,
    completed: results.some(
      (result) =>
        result.type === "END" && result.status === "COMPLETED",
    ),
    waiting: false,
    failed: false,
    results,
  };
}
''')


def write_edge_editor() -> None:
    path = Path("src/components/automation/workflow-edge-editor.tsx")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(r'''"use client";

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
''')


def upgrade_designer() -> None:
    path = Path("src/components/automation/visual-workflow-designer.tsx")
    if not path.exists():
        raise SystemExit("visual-workflow-designer.tsx was not found.")

    content = path.read_text()
    if "executeAutomationRuntimeGraph" in content:
        print("B2.9.2.4 designer integration is already present.")
        return

    content = content.replace(
        'import { WorkflowToolbar } from "./workflow-toolbar";',
        'import { WorkflowToolbar } from "./workflow-toolbar";\n'
        'import { WorkflowEdgeEditor } from "./workflow-edge-editor";',
        1,
    )

    content = content.replace(
        'import { compileAutomationRuntimePlan } from "@/core/enterprise-automation/runtime-plan";',
        'import { compileAutomationRuntimePlan } from "@/core/enterprise-automation/runtime-plan";\n'
        'import { executeAutomationRuntimeGraph } from "@/core/enterprise-automation/runtime-executor";\n'
        'import { normalizeAutomationCanvasViewport } from "@/core/enterprise-automation/viewport";',
        1,
    )

    old = '''  const graph = history[historyIndex];
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });
'''
    new = '''  const graph = history[historyIndex];

  const initialViewport = normalizeAutomationCanvasViewport(
    initialState?.canvasViewport,
  );

  const [zoom, setZoom] = useState(initialViewport.zoom);
  const [pan, setPan] = useState({
    x: initialViewport.panX,
    y: initialViewport.panY,
  });
'''
    if old not in content:
        raise SystemExit("Could not locate viewport state anchor.")
    content = content.replace(old, new, 1)

    anchor = '''  const [simulation, setSimulation] =
    useState<ReturnType<
      typeof simulateAutomationCanvasGraph
    > | null>(null);
'''
    if anchor not in content:
        raise SystemExit("Could not locate simulation state anchor.")
    content = content.replace(
        anchor,
        anchor + '''
  const [runtimeExecution, setRuntimeExecution] =
    useState<Awaited<
      ReturnType<typeof executeAutomationRuntimeGraph>
    > | null>(null);
''',
        1,
    )

    content = content.replace(
        '''    canvasGraph: graph,
  };''',
        '''    canvasGraph: graph,
    canvasViewport: {
      zoom,
      panX: pan.x,
      panY: pan.y,
    },
  };''',
        1,
    )

    content = content.replace(
        "        onResetView={() => setZoom(1)}",
        '''        onResetView={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}''',
        1,
    )

    inspector = '''          <WorkflowInspector
            graph={graph}
            node={selectedNode}
            onChange={commitGraph}
          />
'''
    if inspector not in content:
        raise SystemExit("Could not locate inspector anchor.")
    content = content.replace(
        inspector,
        inspector + '''
          {selectedEdgeId ? (
            <WorkflowEdgeEditor
              graph={graph}
              edgeId={selectedEdgeId}
              onChange={commitGraph}
              onClose={() => setSelectedEdgeId(null)}
            />
          ) : null}
''',
        1,
    )

    button = '''            <button
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
'''
    if button not in content:
        raise SystemExit("Could not locate simulation button anchor.")
    content = content.replace(
        button,
        button + '''
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
''',
        1,
    )

    path.write_text(content)


write_runtime_executor()
write_edge_editor()
upgrade_designer()
print("B2.9.2.4 compatible runtime integration applied.")
