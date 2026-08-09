"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  decideClosedLoopLearningProposal,
  generateClosedLoopLearningProposals,
} from "@/core/closed-loop-procurement/learning-proposals";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateClosedLoopLearningProposalsAction() {
  const user = await requireAnyRole([...roles]);

  await generateClosedLoopLearningProposals(
    user.tenantId,
  );

  revalidatePath(
    "/app/analytics/outcome-learning/proposals",
  );
}

export async function decideClosedLoopLearningProposalAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const decision = field(data, "decision");

  if (
    decision !== "APPROVE" &&
    decision !== "REJECT"
  ) {
    throw new Error(
      "Decision must be APPROVE or REJECT.",
    );
  }

  await decideClosedLoopLearningProposal({
    tenantId: user.tenantId,
    userId: user.id,
    proposalId: field(data, "proposalId"),
    decision,
    note: field(data, "note") || null,
  });

  revalidatePath(
    "/app/analytics/outcome-learning/proposals",
  );
}
