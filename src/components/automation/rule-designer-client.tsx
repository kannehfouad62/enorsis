"use client";

import { useMemo, useState } from "react";
import { saveAutomationDesignerVersionAction } from "@/modules/enterprise-automation/designer-actions";
import type {
  AutomationDesignerState,
  ConditionGroup,
} from "@/core/enterprise-automation/designer-types";

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const emptyState: AutomationDesignerState = {
  trigger: {
    triggerType: "MANUAL",
  },
  conditions: {
    id: "root",
    kind: "group",
    combinator: "AND",
    children: [],
  },
  actions: [],
};

function addCondition(
  group: ConditionGroup,
): ConditionGroup {
  return {
    ...group,
    children: [
      ...group.children,
      {
        id: id("condition"),
        kind: "condition",
        field: "",
        operator: "EQ",
        value: "",
      },
    ],
  };
}

export function RuleDesignerClient({
  ruleId,
  initialState,
}: {
  ruleId: string;
  initialState: AutomationDesignerState | null;
}) {
  const [state, setState] = useState<AutomationDesignerState>(
    initialState ?? emptyState,
  );

  const serialized = useMemo(
    () => JSON.stringify(state),
    [state],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-black uppercase text-slate-500">
          Trigger
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select
            value={state.trigger.triggerType}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                trigger: {
                  ...current.trigger,
                  triggerType:
                    event.target.value as AutomationDesignerState["trigger"]["triggerType"],
                },
              }))
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="MANUAL">Manual</option>
            <option value="DOMAIN_EVENT">Domain Event</option>
            <option value="SCHEDULE">Schedule</option>
            <option value="RECORD_CONDITION">Record Condition</option>
          </select>

          <input
            value={
              state.trigger.eventType ??
              state.trigger.scheduleExpression ??
              ""
            }
            onChange={(event) =>
              setState((current) => ({
                ...current,
                trigger: {
                  ...current.trigger,
                  ...(current.trigger.triggerType === "SCHEDULE"
                    ? { scheduleExpression: event.target.value }
                    : { eventType: event.target.value }),
                },
              }))
            }
            placeholder="Event type or schedule expression"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">
              Conditions
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Root group uses {state.conditions.combinator}.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={state.conditions.combinator}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  conditions: {
                    ...current.conditions,
                    combinator: event.target.value as "AND" | "OR",
                  },
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>

            <button
              type="button"
              onClick={() =>
                setState((current) => ({
                  ...current,
                  conditions: addCondition(current.conditions),
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black"
            >
              Add condition
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {state.conditions.children.map((child, index) =>
            child.kind === "condition" ? (
              <div
                key={child.id}
                className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-4"
              >
                <input
                  value={child.field}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        children: current.conditions.children.map(
                          (item, itemIndex) =>
                            itemIndex === index &&
                            item.kind === "condition"
                              ? {
                                  ...item,
                                  field: event.target.value,
                                }
                              : item,
                        ),
                      },
                    }))
                  }
                  placeholder="Field e.g. amount"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={child.operator}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        children: current.conditions.children.map(
                          (item, itemIndex) =>
                            itemIndex === index &&
                            item.kind === "condition"
                              ? {
                                  ...item,
                                  operator:
                                    event.target
                                      .value as typeof child.operator,
                                }
                              : item,
                        ),
                      },
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {[
                    "EQ",
                    "NEQ",
                    "GT",
                    "GTE",
                    "LT",
                    "LTE",
                    "CONTAINS",
                    "STARTS_WITH",
                    "ENDS_WITH",
                    "IN",
                    "NOT_IN",
                    "EXISTS",
                    "NOT_EXISTS",
                    "BETWEEN",
                  ].map((operator) => (
                    <option key={operator}>{operator}</option>
                  ))}
                </select>
                <input
                  value={String(child.value ?? "")}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        children: current.conditions.children.map(
                          (item, itemIndex) =>
                            itemIndex === index &&
                            item.kind === "condition"
                              ? {
                                  ...item,
                                  value: event.target.value,
                                }
                              : item,
                        ),
                      },
                    }))
                  }
                  placeholder="Value"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        children:
                          current.conditions.children.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                      },
                    }))
                  }
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Actions
          </p>
          <button
            type="button"
            onClick={() =>
              setState((current) => ({
                ...current,
                actions: [
                  ...current.actions,
                  {
                    id: id("action"),
                    actionType: "PUBLISH_EVENT",
                    configuration: {},
                  },
                ],
              }))
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black"
          >
            Add action
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {state.actions.map((action, index) => (
            <div
              key={action.id}
              className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-3"
            >
              <select
                value={action.actionType}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    actions: current.actions.map(
                      (item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              actionType:
                                event.target
                                  .value as typeof action.actionType,
                            }
                          : item,
                    ),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="START_WORKFLOW">Start workflow</option>
                <option value="CREATE_NOTIFICATION">Create notification</option>
                <option value="CREATE_TASK">Create task</option>
                <option value="PUBLISH_EVENT">Publish event</option>
                <option value="LOG_ACTIVITY">Log activity</option>
              </select>

              <input
                value={String(
                  action.configuration.eventType ??
                    action.configuration.workflowDefinitionId ??
                    action.configuration.notificationTitle ??
                    action.configuration.taskTitle ??
                    action.configuration.activityTitle ??
                    "",
                )}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    actions: current.actions.map(
                      (item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              configuration: {
                                ...item.configuration,
                                eventType: event.target.value,
                              },
                            }
                          : item,
                    ),
                  }))
                }
                placeholder="Primary configuration value"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    actions: current.actions.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <form action={saveAutomationDesignerVersionAction}>
        <input type="hidden" name="ruleId" value={ruleId} />
        <input type="hidden" name="designerState" value={serialized} />
        <input
          name="changeSummary"
          placeholder="Version change summary"
          className="mr-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
          Save new version
        </button>
      </form>
    </div>
  );
}
