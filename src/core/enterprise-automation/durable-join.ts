import { prisma } from "@/lib/prisma";
import type { AutomationCanvasGraph } from "./graph-types";
import { incomingNodeIds } from "./durable-runtime-policy";

export async function isDurableJoinReady(input: {
  executionId: string;
  graph: AutomationCanvasGraph;
  joinNodeId: string;
}) {
  const incoming = incomingNodeIds(input.graph, input.joinNodeId);
  if (incoming.length < 2) {
    return { ready: false, incoming, completed: [], missing: incoming };
  }

  const checkpoints = await prisma.enterpriseAutomationRuntimeNode.findMany({
    where: {
      executionId: input.executionId,
      nodeId: { in: incoming },
      status: "COMPLETED",
    },
    select: { nodeId: true },
  });

  const completed = Array.from(new Set(checkpoints.map((item) => item.nodeId)));
  const missing = incoming.filter((nodeId) => !completed.includes(nodeId));
  return { ready: missing.length === 0, incoming, completed, missing };
}
