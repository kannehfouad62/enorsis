"use server";

import { revalidatePath } from "next/cache";
import type { AiCapability } from "@/generated/prisma/enums";
import { requireAuthenticatedIdentity, requireAnyRole } from "@/core/auth/authorization";
import { executeGovernedAi } from "@/core/ai/gateway";
import { prisma } from "@/lib/prisma";

export async function runProcurementCopilotAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();
  const capability = String(
    formData.get("capability") ?? "PROCUREMENT_COPILOT",
  ) as AiCapability;
  const input = String(formData.get("input") ?? "").trim();

  if (input.length < 10 || input.length > 12000) {
    throw new Error("AI requests must contain between 10 and 12,000 characters.");
  }

  const userEmail = user.email;

  if (!userEmail) {
    throw new Error(
      "Your authenticated account does not have an email address.",
    );
  }

  await executeGovernedAi({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail,
    capability,
    input,
  });

  revalidatePath("/app/agents");
}

export async function reviewAiExecutionAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "LEGAL",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const executionId = String(formData.get("executionId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  const execution = await prisma.aiExecution.findFirstOrThrow({
    where: { id: executionId, tenantId: user.tenantId },
  });

  await prisma.aiExecution.update({
    where: { id: execution.id },
    data: {
      reviewStatus: decision === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action:
        decision === "ACCEPTED"
          ? "ai_execution.accept"
          : "ai_execution.reject",
      resourceType: "AiExecution",
      resourceId: execution.id,
      before: { reviewStatus: execution.reviewStatus },
      after: { reviewStatus: decision },
    },
  });

  revalidatePath("/app/agents");
}
