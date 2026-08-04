import type { AiAgent, AiAgentTaskType } from "@/generated/prisma/client";

const forbiddenActions = [
  "approve supplier",
  "award sourcing event",
  "sign contract",
  "activate contract",
  "issue purchase order",
  "approve invoice",
  "mark payment ready",
  "approve payment batch",
  "send payment",
  "execute payment",
];

export function evaluateAgentTaskPolicy({
  agent,
  type,
  instruction,
}: {
  agent: AiAgent;
  type: AiAgentTaskType;
  instruction: string;
}) {
  const normalized = instruction.toLowerCase();
  const forbiddenMatch = forbiddenActions.find((action) =>
    normalized.includes(action),
  );

  if (forbiddenMatch) {
    return {
      allowed: false,
      reason:
        `The instruction requests a restricted operational action: ${forbiddenMatch}. ` +
        "Enorsis agents may prepare analysis and drafts, but humans retain approval and execution authority.",
    };
  }

  if (!agent.allowedCapabilities.includes(type)) {
    return {
      allowed: false,
      reason: `The selected agent is not authorized for ${type}.`,
    };
  }

  if (
    agent.restrictedActions.some((action) =>
      normalized.includes(action.toLowerCase()),
    )
  ) {
    return {
      allowed: false,
      reason: "The instruction conflicts with an agent-specific restricted action.",
    };
  }

  return {
    allowed: true,
    reason: null,
    requiresApproval:
      agent.humanApprovalRequired ||
      agent.autonomyLevel !== "POLICY_BOUND_AUTONOMOUS",
  };
}
