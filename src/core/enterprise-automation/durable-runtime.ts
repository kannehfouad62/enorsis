import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import type {
  AutomationCanvasGraph,
  AutomationCanvasNode,
} from "./graph-types";
import { compileAutomationRuntimePlan } from "./runtime-plan";
import {
  durableRetryPolicy,
  retryDelayForAttempt,
  timeoutAtForNode,
} from "./durable-runtime-policy";
import { isDurableJoinReady } from "./durable-join";

function getPath(
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

function conditionMatches(
  node: AutomationCanvasNode,
  payload: Record<string, unknown>,
) {
  const field = String(node.configuration.field ?? "");
  const operator = String(node.configuration.operator ?? "EQ");
  const expected = node.configuration.value;
  const observed = getPath(payload, field);

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

async function createReadyNode(input: {
  tenantId: string;
  executionId: string;
  node: AutomationCanvasNode;
  branchKey?: string | null;
  payload?: Record<string, unknown>;
}) {
  return prisma.enterpriseAutomationRuntimeNode.create({
    data: {
      tenantId: input.tenantId,
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      branchKey: input.branchKey ?? null,
      status: "READY",
      payload: toJson(input.payload ?? {}),
    },
  });
}

export async function startDurableAutomationExecution(input: {
  tenantId: string;
  ruleId: string;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const rule = await prisma.enterpriseAutomationRule.findFirstOrThrow({
    where: {
      id: input.ruleId,
      tenantId: input.tenantId,
      status: "ACTIVE",
    },
  });

  const state = rule.designerState as {
    canvasGraph?: AutomationCanvasGraph;
  } | null;

  if (!state?.canvasGraph) {
    throw new Error("Automation rule has no published canvas graph.");
  }

  const plan = compileAutomationRuntimePlan(state.canvasGraph);
  const count = await prisma.enterpriseAutomationRuntimeExecution.count({
    where: { tenantId: input.tenantId },
  });

  const execution =
    await prisma.enterpriseAutomationRuntimeExecution.create({
      data: {
        tenantId: input.tenantId,
        ruleId: rule.id,
        executionNumber: `RUN-${new Date().getFullYear()}-${String(
          count + 1,
        ).padStart(7, "0")}`,
        status: "RUNNING",
        graphSnapshot: toJson(state.canvasGraph),
        input: toJson(input.payload ?? {}),
        context: toJson({
          publishedVersion: rule.publishedVersion ?? null,
        }),
        initiatedByUserId: input.actorUserId ?? null,
      },
    });

  const entry = state.canvasGraph.nodes.find(
    (node) => node.id === plan.entryNodeId,
  );

  if (!entry) {
    throw new Error("Compiled automation entry node was not found.");
  }

  await createReadyNode({
    tenantId: input.tenantId,
    executionId: execution.id,
    node: entry,
    payload: input.payload ?? {},
  });

  return resumeDurableAutomationExecution({
    tenantId: input.tenantId,
    executionId: execution.id,
  });
}

export async function resumeDurableAutomationExecution(input: {
  tenantId: string;
  executionId: string;
}) {
  const execution =
    await prisma.enterpriseAutomationRuntimeExecution.findFirstOrThrow({
      where: {
        id: input.executionId,
        tenantId: input.tenantId,
      },
    });

  if (
    execution.status === "COMPLETED" ||
    execution.status === "FAILED" ||
    execution.status === "CANCELLED"
  ) {
    return execution;
  }

  const graph =
    execution.graphSnapshot as unknown as AutomationCanvasGraph;
  const plan = compileAutomationRuntimePlan(graph);
  const nodeMap = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );
  const instructionMap = new Map(
    plan.instructions.map((instruction) => [
      instruction.nodeId,
      instruction,
    ]),
  );

  const now = new Date();

  await prisma.enterpriseAutomationRuntimeNode.updateMany({
    where: {
      executionId: execution.id,
      status: "WAITING",
      availableAt: { lte: now },
      waitReason: { in: ["TIME", "RETRY"] },
    },
    data: {
      status: "READY",
      waitReason: null,
    },
  });

  while (true) {
    const checkpoint =
      await prisma.enterpriseAutomationRuntimeNode.findFirst({
        where: {
          executionId: execution.id,
          status: "READY",
          OR: [
            { availableAt: null },
            { availableAt: { lte: new Date() } },
          ],
        },
        orderBy: { createdAt: "asc" },
      });

    if (!checkpoint) break;

    const node = nodeMap.get(checkpoint.nodeId);
    const instruction = instructionMap.get(checkpoint.nodeId);

    if (!node || !instruction) {
      await prisma.enterpriseAutomationRuntimeNode.update({
        where: { id: checkpoint.id },
        data: {
          status: "FAILED",
          lastError: "Runtime graph node or instruction is missing.",
          completedAt: new Date(),
        },
      });

      await prisma.enterpriseAutomationRuntimeExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          lastError: "Runtime graph is inconsistent.",
        },
      });

      break;
    }

    const nodeStartedAt =
      checkpoint.startedAt ?? new Date();

    await prisma.enterpriseAutomationRuntimeNode.update({
      where: { id: checkpoint.id },
      data: {
        status: "RUNNING",
        attemptCount: { increment: 1 },
        startedAt: nodeStartedAt,
        timeoutAt: timeoutAtForNode(node, nodeStartedAt),
      },
    });

    if (node.type === "WAIT") {
      const minutes = Math.max(
        1,
        Number(node.configuration.durationMinutes ?? 60),
      );
      const availableAt = new Date(
        Date.now() + minutes * 60_000,
      );

      await prisma.enterpriseAutomationRuntimeNode.update({
        where: { id: checkpoint.id },
        data: {
          status: "WAITING",
          waitReason: "TIME",
          availableAt,
        },
      });

      await prisma.enterpriseAutomationRuntimeExecution.update({
        where: { id: execution.id },
        data: {
          status: "WAITING",
          wakeAt: availableAt,
        },
      });

      break;
    }

    if (node.type === "JOIN") {
      const join = await isDurableJoinReady({
        executionId: execution.id,
        graph,
        joinNodeId: node.id,
      });

      if (!join.ready) {
        await prisma.enterpriseAutomationRuntimeNode.update({
          where: { id: checkpoint.id },
          data: {
            status: "WAITING",
            waitReason: "PARALLEL_JOIN",
            result: toJson({
              missingIncomingNodeIds: join.missing,
            }),
          },
        });
        break;
      }
    }

    if (node.type === "APPROVAL") {
      await prisma.enterpriseAutomationRuntimeNode.update({
        where: { id: checkpoint.id },
        data: {
          status: "WAITING",
          waitReason: "APPROVAL",
        },
      });

      await prisma.enterpriseAutomationRuntimeExecution.update({
        where: { id: execution.id },
        data: {
          status: "WAITING",
          wakeAt: null,
        },
      });

      break;
    }

    let outgoing = instruction.next;

    if (node.type === "CONDITION") {
      const matched = conditionMatches(
        node,
        execution.input as Record<string, unknown>,
      );
      const desired = matched ? "TRUE" : "FALSE";
      const branch =
        outgoing.find(
          (edge) =>
            String(edge.label ?? "").toUpperCase() === desired,
        ) ?? outgoing[matched ? 0 : 1];

      outgoing = branch ? [branch] : [];
    }

    if (node.type === "ACTION") {
      await publishDomainEvent({
        tenantId: input.tenantId,
        eventType:
          "EnterpriseAutomation.RuntimeActionRequested",
        aggregateType:
          "EnterpriseAutomationRuntimeExecution",
        aggregateId: execution.id,
        sourceModule: "enterprise-automation",
        payload: {
          executionId: execution.id,
          nodeId: node.id,
          actionType:
            node.configuration.actionType ?? null,
          configuration: node.configuration,
          input: execution.input,
        },
      });
    }

    await prisma.enterpriseAutomationRuntimeNode.update({
      where: { id: checkpoint.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        timeoutAt: null,
        result: toJson({
          outgoing: outgoing.map((edge) => edge.target),
        }),
      },
    });

    for (const edge of outgoing) {
      const nextNode = nodeMap.get(edge.target);
      if (!nextNode) continue;

      await createReadyNode({
        tenantId: input.tenantId,
        executionId: execution.id,
        node: nextNode,
        branchKey: edge.label ?? null,
        payload:
          execution.input as Record<string, unknown>,
      });
    }
  }

  const [
    readyCount,
    runningCount,
    waitingNodes,
    failedCount,
  ] = await Promise.all([
    prisma.enterpriseAutomationRuntimeNode.count({
      where: {
        executionId: execution.id,
        status: "READY",
      },
    }),
    prisma.enterpriseAutomationRuntimeNode.count({
      where: {
        executionId: execution.id,
        status: "RUNNING",
      },
    }),
    prisma.enterpriseAutomationRuntimeNode.findMany({
      where: {
        executionId: execution.id,
        status: "WAITING",
      },
      orderBy: { availableAt: "asc" },
    }),
    prisma.enterpriseAutomationRuntimeNode.count({
      where: {
        executionId: execution.id,
        status: "FAILED",
      },
    }),
  ]);

  if (failedCount > 0) {
    return prisma.enterpriseAutomationRuntimeExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
  }

  if (
    readyCount === 0 &&
    runningCount === 0 &&
    waitingNodes.length === 0
  ) {
    return prisma.enterpriseAutomationRuntimeExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        wakeAt: null,
      },
    });
  }

  const nextWake =
    waitingNodes
      .map((node) => node.availableAt)
      .filter((value): value is Date => Boolean(value))
      .sort(
        (a, b) => a.getTime() - b.getTime(),
      )[0] ?? null;

  return prisma.enterpriseAutomationRuntimeExecution.update({
    where: { id: execution.id },
    data: {
      status:
        waitingNodes.length > 0
          ? "WAITING"
          : "RUNNING",
      wakeAt: nextWake,
    },
  });
}

export async function signalDurableAutomationExecution(input: {
  tenantId: string;
  executionId: string;
  correlationNodeId: string;
  signalType:
    | "APPROVAL"
    | "RESUME"
    | "RETRY"
    | "RECOVER"
    | "CANCEL";
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}) {
  const execution =
    await prisma.enterpriseAutomationRuntimeExecution.findFirstOrThrow({
      where: {
        id: input.executionId,
        tenantId: input.tenantId,
      },
    });

  await prisma.enterpriseAutomationRuntimeSignal.create({
    data: {
      tenantId: input.tenantId,
      executionId: execution.id,
      signalType: input.signalType,
      correlationKey: input.correlationNodeId,
      payload: toJson(input.payload ?? {}),
      createdByUserId: input.actorUserId ?? null,
      consumedAt: new Date(),
    },
  });

  if (input.signalType === "CANCEL") {
    return prisma.enterpriseAutomationRuntimeExecution.update({
      where: { id: execution.id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        wakeAt: null,
      },
    });
  }

  const waiting =
    await prisma.enterpriseAutomationRuntimeNode.findFirstOrThrow({
      where: {
        executionId: execution.id,
        nodeId: input.correlationNodeId,
        status: "WAITING",
      },
    });

  await prisma.enterpriseAutomationRuntimeNode.update({
    where: { id: waiting.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      waitReason: null,
      result: toJson(input.payload ?? {}),
    },
  });

  const graph =
    execution.graphSnapshot as unknown as AutomationCanvasGraph;
  const plan = compileAutomationRuntimePlan(graph);
  const instruction = plan.instructions.find(
    (item) => item.nodeId === input.correlationNodeId,
  );
  const nodeMap = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );

  const decision = String(
    input.payload?.decision ?? "",
  ).toUpperCase();

  const outgoing =
    input.signalType === "APPROVAL" && decision
      ? instruction?.next.filter(
          (edge) =>
            String(edge.label ?? "").toUpperCase() ===
            decision,
        ) ?? []
      : instruction?.next ?? [];

  for (const edge of outgoing) {
    const node = nodeMap.get(edge.target);
    if (!node) continue;

    await createReadyNode({
      tenantId: input.tenantId,
      executionId: execution.id,
      node,
      branchKey: edge.label ?? null,
      payload:
        execution.input as Record<string, unknown>,
    });
  }

  await prisma.enterpriseAutomationRuntimeExecution.update({
    where: { id: execution.id },
    data: {
      status: "RUNNING",
      wakeAt: null,
    },
  });

  return resumeDurableAutomationExecution({
    tenantId: input.tenantId,
    executionId: execution.id,
  });
}
