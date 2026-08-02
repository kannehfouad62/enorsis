"use server";

import { revalidatePath } from "next/cache";
import type { AiCapability } from "@/generated/prisma/enums";
import {
  requireAnyRole,
  requireAuthenticatedIdentity,
} from "@/core/auth/authorization";
import { executeGovernedAi } from "@/core/ai/gateway";
import {
  buildContractAiContext,
  buildSourcingAiContext,
  buildSupplierAiContext,
} from "./context";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireEmail(email: string | null | undefined) {
  if (!email) {
    throw new Error(
      "Your authenticated account does not have an email address.",
    );
  }

  return email;
}

async function runContextualAnalysis({
  tenantId,
  userId,
  userEmail,
  capability,
  instruction,
  context,
  resourceType,
  resourceId,
}: {
  tenantId: string;
  userId: string;
  userEmail: string;
  capability: AiCapability;
  instruction: string;
  context: string;
  resourceType: string;
  resourceId: string;
}) {
  return executeGovernedAi({
    tenantId,
    userId,
    userEmail,
    capability,
    resourceType,
    resourceId,
    input:
      `${instruction}\n\n` +
      "Use only the governed Enorsis record context below. " +
      "Separate facts, analysis, uncertainty, risks and recommended actions.\n\n" +
      context,
  });
}

export async function analyzeSupplierAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();
  const supplierId = field(formData, "supplierId");
  const instruction =
    field(formData, "instruction") ||
    "Prepare a supplier due-diligence brief. Identify qualification gaps, compliance exposure, contract concentration, sourcing performance, ESG concerns and recommended controls.";

  const context = await buildSupplierAiContext(user.tenantId, supplierId);

  await runContextualAnalysis({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: requireEmail(user.email),
    capability: "SUPPLIER_ANALYSIS",
    instruction,
    context,
    resourceType: "Supplier",
    resourceId: supplierId,
  });

  revalidatePath(`/app/suppliers/${supplierId}/intelligence`);
}

export async function draftRfxAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();
  const sourcingEventId = field(formData, "sourcingEventId");
  const instruction =
    field(formData, "instruction") ||
    "Improve this RFx package. Produce a refined scope, mandatory requirements, evaluation criteria, supplier questions, risk controls, ESG requirements, commercial assumptions and a human-review checklist.";

  const context = await buildSourcingAiContext(
    user.tenantId,
    sourcingEventId,
  );

  await runContextualAnalysis({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: requireEmail(user.email),
    capability: "RFX_DRAFT",
    instruction,
    context,
    resourceType: "SourcingEvent",
    resourceId: sourcingEventId,
  });

  revalidatePath(`/app/sourcing/${sourcingEventId}/intelligence`);
}

export async function adviseNegotiationAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const sourcingEventId = field(formData, "sourcingEventId");
  const instruction =
    field(formData, "instruction") ||
    "Prepare a negotiation strategy using the submitted bids and evaluation record. Include target outcomes, walk-away positions, tradeable terms, supplier-specific leverage, approval boundaries and questions requiring clarification.";

  const context = await buildSourcingAiContext(
    user.tenantId,
    sourcingEventId,
  );

  await runContextualAnalysis({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: requireEmail(user.email),
    capability: "NEGOTIATION_ADVISOR",
    instruction,
    context,
    resourceType: "SourcingEvent",
    resourceId: sourcingEventId,
  });

  revalidatePath(`/app/sourcing/${sourcingEventId}/intelligence`);
}

export async function reviewContractWithAiAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const contractId = field(formData, "contractId");
  const instruction =
    field(formData, "instruction") ||
    "Prepare a governed contract risk review. Analyze clauses, obligations, approval status, renewal exposure, supplier risk, amendments and missing controls. Flag prohibited or high-risk terms and provide a prioritized remediation plan.";

  const context = await buildContractAiContext(user.tenantId, contractId);

  await runContextualAnalysis({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: requireEmail(user.email),
    capability: "CONTRACT_REVIEW",
    instruction,
    context,
    resourceType: "Contract",
    resourceId: contractId,
  });

  revalidatePath(`/app/contracts/${contractId}/intelligence`);
}

export async function createExecutiveProcurementBriefAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const subjectType = field(formData, "subjectType");
  const resourceId = field(formData, "resourceId");
  const instruction =
    field(formData, "instruction") ||
    "Create an executive decision brief covering decision required, value, risk, deadlines, dependencies, alternatives, recommendation and approval considerations.";

  const context =
    subjectType === "Supplier"
      ? await buildSupplierAiContext(user.tenantId, resourceId)
      : subjectType === "Contract"
        ? await buildContractAiContext(user.tenantId, resourceId)
        : await buildSourcingAiContext(user.tenantId, resourceId);

  await runContextualAnalysis({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: requireEmail(user.email),
    capability: "EXECUTIVE_BRIEF",
    instruction,
    context,
    resourceType: subjectType,
    resourceId,
  });

  revalidatePath("/app/agents/executive");
}
