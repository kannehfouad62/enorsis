import { z } from "zod";

export const aiAgentPolicySchema = z.object({
  autonomyLevel: z.enum([
    "ADVISORY",
    "DRAFT_ONLY",
    "HUMAN_APPROVAL_REQUIRED",
    "POLICY_BOUND_AUTONOMOUS",
  ]),
  humanApprovalRequired: z.boolean(),
  allowedCapabilities: z.array(z.string().min(1)),
  restrictedActions: z.array(z.string().min(1)),
  maximumTransactionUsd: z.number().positive().nullable(),
  riskTier: z.number().int().min(1).max(5),
});

export type AiAgentPolicy = z.infer<typeof aiAgentPolicySchema>;

const alwaysHumanApprovedActions = new Set([
  "SUPPLIER_AWARD",
  "CONTRACT_EXECUTION",
  "PURCHASE_ORDER_RELEASE",
  "PAYMENT_RELEASE",
  "BANK_DETAIL_CHANGE",
  "USER_ROLE_CHANGE",
]);

export function requiresHumanApproval(
  policy: AiAgentPolicy,
  action: string,
  transactionUsd?: number,
): boolean {
  if (alwaysHumanApprovedActions.has(action)) {
    return true;
  }

  if (policy.humanApprovalRequired) {
    return true;
  }

  if (
    transactionUsd !== undefined &&
    policy.maximumTransactionUsd !== null &&
    transactionUsd > policy.maximumTransactionUsd
  ) {
    return true;
  }

  return policy.restrictedActions.includes(action);
}
