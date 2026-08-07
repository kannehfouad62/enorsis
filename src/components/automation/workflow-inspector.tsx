"use client";

import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "@/core/enterprise-automation/graph-types";

export function WorkflowInspector({
  graph,
  node,
  onChange,
}: {
  graph: AutomationCanvasGraph;
  node: AutomationCanvasNode | null;
  onChange: (graph: AutomationCanvasGraph) => void;
}) {
  if (!node) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Select a node to edit its properties.
      </div>
    );
  }

  const updateNode = (
    patch: Partial<AutomationCanvasNode>,
  ) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((item) =>
        item.id === node.id ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateConfiguration = (
    key: string,
    value: unknown,
  ) => {
    updateNode({
      configuration: {
        ...node.configuration,
        [key]: value,
      },
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-black uppercase text-slate-500">
        Inspector
      </p>

      <div className="mt-4 space-y-3">
        <input
          value={node.label}
          onChange={(event) =>
            updateNode({ label: event.target.value })
          }
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />

        {node.type === "TRIGGER" ? (
          <>
            <select
              value={String(
                node.configuration.triggerType ?? "DOMAIN_EVENT",
              )}
              onChange={(event) =>
                updateConfiguration(
                  "triggerType",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="DOMAIN_EVENT">Domain Event</option>
              <option value="SCHEDULE">Schedule</option>
              <option value="MANUAL">Manual</option>
              <option value="RECORD_CONDITION">
                Record Condition
              </option>
            </select>
            <input
              value={String(
                node.configuration.eventType ??
                  node.configuration.scheduleExpression ??
                  "",
              )}
              onChange={(event) =>
                updateConfiguration(
                  String(node.configuration.triggerType) ===
                    "SCHEDULE"
                    ? "scheduleExpression"
                    : "eventType",
                  event.target.value,
                )
              }
              placeholder="Event type or schedule"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </>
        ) : null}

        {node.type === "CONDITION" ? (
          <>
            <input
              value={String(node.configuration.field ?? "")}
              onChange={(event) =>
                updateConfiguration(
                  "field",
                  event.target.value,
                )
              }
              placeholder="Payload field"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={String(node.configuration.operator ?? "EQ")}
              onChange={(event) =>
                updateConfiguration(
                  "operator",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "EXISTS"].map(
                (operator) => (
                  <option key={operator}>{operator}</option>
                ),
              )}
            </select>
            <input
              value={String(node.configuration.value ?? "")}
              onChange={(event) =>
                updateConfiguration(
                  "value",
                  event.target.value,
                )
              }
              placeholder="Comparison value"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </>
        ) : null}

        {node.type === "ACTION" ? (
          <>
            <select
              value={String(
                node.configuration.actionType ??
                  "PUBLISH_EVENT",
              )}
              onChange={(event) =>
                updateConfiguration(
                  "actionType",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="START_WORKFLOW">
                Start Workflow
              </option>
              <option value="CREATE_NOTIFICATION">
                Create Notification
              </option>
              <option value="CREATE_TASK">Create Task</option>
              <option value="PUBLISH_EVENT">
                Publish Event
              </option>
              <option value="LOG_ACTIVITY">
                Log Activity
              </option>
            </select>
            <textarea
              value={JSON.stringify(
                node.configuration,
                null,
                2,
              )}
              onChange={(event) => {
                try {
                  updateNode({
                    configuration: JSON.parse(
                      event.target.value,
                    ) as Record<string, unknown>,
                  });
                } catch {
                  // Preserve the last valid object while typing invalid JSON.
                }
              }}
              className="min-h-40 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
            />
          </>
        ) : null}

        {node.type === "WAIT" ? (
          <input
            type="number"
            min="1"
            value={Number(
              node.configuration.durationMinutes ?? 60,
            )}
            onChange={(event) =>
              updateConfiguration(
                "durationMinutes",
                Number(event.target.value),
              )
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        ) : null}
      </div>
    </div>
  );
}
