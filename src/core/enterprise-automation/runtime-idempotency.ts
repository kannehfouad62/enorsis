import { createHash } from "node:crypto";

export function buildAutomationActionIdempotencyKey(input: {
  tenantId: string;
  executionId: string;
  runtimeNodeId: string;
  nodeId: string;
  actionType: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.tenantId,
        input.executionId,
        input.runtimeNodeId,
        input.nodeId,
        input.actionType,
      ].join(":"),
    )
    .digest("hex");
}

export function buildAutomationCallbackKey(input: {
  actionId: string;
  externalCallbackId?: string | null;
  payload: unknown;
}) {
  const raw = input.externalCallbackId
    ? `${input.actionId}:${input.externalCallbackId}`
    : `${input.actionId}:${JSON.stringify(input.payload)}`;

  return createHash("sha256").update(raw).digest("hex");
}
