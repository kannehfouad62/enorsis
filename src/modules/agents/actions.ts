"use server";

import { revalidatePath } from "next/cache";
import type { AiAgentTaskType } from "@/generated/prisma/client";
import { requireAnyRole } from "@/core/auth/authorization";
import { executeGovernedAi } from "@/core/ai/gateway";
import { prisma } from "@/lib/prisma";
import { evaluateAgentTaskPolicy } from "./policies";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const capabilityByTask = {
  SUPPLIER_DUE_DILIGENCE: "SUPPLIER_ANALYSIS",
  RFX_DRAFT: "RFX_DRAFT",
  NEGOTIATION_PLAN: "NEGOTIATION_ADVISOR",
  CONTRACT_REVIEW: "CONTRACT_REVIEW",
  SPEND_OPPORTUNITY: "SPEND_ANALYSIS",
  RISK_MONITORING: "RISK_BRIEF",
  EXECUTIVE_BRIEF: "EXECUTIVE_BRIEF",
  INVOICE_EXCEPTION_ANALYSIS: "PROCUREMENT_COPILOT",
} as const;

export async function createAgentTaskAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "LEGAL",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const agentId = field(formData, "agentId");
  const type = field(formData, "type") as AiAgentTaskType;
  const instruction = field(formData, "instruction");

  if (instruction.length < 10 || instruction.length > 12000) {
    throw new Error("Agent instructions must contain between 10 and 12,000 characters.");
  }

  const agent = await prisma.aiAgent.findFirstOrThrow({
    where: {
      id: agentId,
      tenantId: user.tenantId,
      status: "ACTIVE",
    },
  });

  const policy = evaluateAgentTaskPolicy({ agent, type, instruction });

  if (!policy.allowed) {
    throw new Error(policy.reason ?? "The agent task is not permitted.");
  }

  const task = await prisma.aiAgentTask.create({
    data: {
      tenantId: user.tenantId,
      agentId: agent.id,
      requestedByUserId: user.id,
      type,
      status: policy.requiresApproval ? "WAITING_APPROVAL" : "QUEUED",
      title: field(formData, "title"),
      instruction,
      resourceType: field(formData, "resourceType") || null,
      resourceId: field(formData, "resourceId") || null,
      priority: Number(field(formData, "priority") || 50),
      requiresApproval: policy.requiresApproval ?? true,
      policySnapshot: {
        autonomyLevel: agent.autonomyLevel,
        humanApprovalRequired: agent.humanApprovalRequired,
        allowedCapabilities: agent.allowedCapabilities,
        restrictedActions: agent.restrictedActions,
      },
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "ai_agent_task.create",
      resourceType: "AiAgentTask",
      resourceId: task.id,
      after: {
        agentId: agent.id,
        type,
        status: task.status,
        requiresApproval: task.requiresApproval,
      },
    },
  });

  revalidatePath("/app/agents/control");
}

export async function assignAgentTaskApproversAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const taskId = field(formData, "taskId");
  const approverIds = formData.getAll("approverUserIds").map(String).filter(Boolean);

  if (approverIds.length === 0) {
    throw new Error("Assign at least one approver.");
  }

  const task = await prisma.aiAgentTask.findFirstOrThrow({
    where: { id: taskId, tenantId: user.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.aiAgentTaskApproval.deleteMany({ where: { taskId: task.id } });
    await tx.aiAgentTaskApproval.createMany({
      data: approverIds.map((approverUserId, index) => ({
        taskId: task.id,
        approverUserId,
        sequence: index + 1,
      })),
    });
    await tx.aiAgentTask.update({
      where: { id: task.id },
      data: { status: "WAITING_APPROVAL" },
    });
  });

  revalidatePath(`/app/agents/control/${task.id}`);
}

export async function decideAgentTaskApprovalAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "LEGAL",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const taskId = field(formData, "taskId");
  const decision = field(formData, "decision");
  const comments = field(formData, "comments");

  const task = await prisma.aiAgentTask.findFirstOrThrow({
    where: { id: taskId, tenantId: user.tenantId },
    include: { approvals: { orderBy: { sequence: "asc" } } },
  });

  const pending = task.approvals.find((approval) => approval.decision === "PENDING");
  const isAdmin = user.roles.some((role) =>
    ["TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  if (!pending || (pending.approverUserId !== user.id && !isAdmin)) {
    throw new Error("This approval step is not assigned to you.");
  }

  const normalized =
    decision === "APPROVED"
      ? "APPROVED"
      : decision === "REJECTED"
        ? "REJECTED"
        : "RETURNED";

  const hasLaterPending = task.approvals.some(
    (approval) =>
      approval.sequence > pending.sequence &&
      approval.decision === "PENDING",
  );

  await prisma.$transaction([
    prisma.aiAgentTaskApproval.update({
      where: { id: pending.id },
      data: {
        decision: normalized,
        comments: comments || null,
        decidedAt: new Date(),
      },
    }),
    prisma.aiAgentTask.update({
      where: { id: task.id },
      data: {
        status:
          normalized === "APPROVED"
            ? hasLaterPending
              ? "WAITING_APPROVAL"
              : "APPROVED"
            : normalized === "REJECTED"
              ? "REJECTED"
              : "DRAFT",
        approvedByUserId:
          normalized === "APPROVED" && !hasLaterPending ? user.id : null,
        approvedAt:
          normalized === "APPROVED" && !hasLaterPending ? new Date() : null,
      },
    }),
  ]);

  revalidatePath(`/app/agents/control/${task.id}`);
  revalidatePath("/app/agents/control");
}

export async function runAgentTaskAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "LEGAL",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const taskId = field(formData, "taskId");
  const task = await prisma.aiAgentTask.findFirstOrThrow({
    where: {
      id: taskId,
      tenantId: user.tenantId,
      status: { in: ["APPROVED", "QUEUED", "FAILED"] },
    },
    include: { agent: true },
  });

  if (task.requiresApproval && task.status !== "APPROVED") {
    throw new Error("This task requires completed human approval.");
  }

  const policy = evaluateAgentTaskPolicy({
    agent: task.agent,
    type: task.type,
    instruction: task.instruction,
  });

  if (!policy.allowed) {
    throw new Error(policy.reason ?? "The task is no longer permitted.");
  }

  const attemptNumber = task.executionCount + 1;

  const attempt = await prisma.aiAgentTaskAttempt.create({
    data: {
      taskId: task.id,
      attemptNumber,
      status: "RUNNING",
      inputSnapshot: {
        instruction: task.instruction,
        resourceType: task.resourceType,
        resourceId: task.resourceId,
      },
    },
  });

  await prisma.aiAgentTask.update({
    where: { id: task.id },
    data: {
      status: "RUNNING",
      executionCount: { increment: 1 },
      startedAt: new Date(),
      failureReason: null,
    },
  });

  try {
    const execution = await executeGovernedAi({
      tenantId: user.tenantId,
      userId: user.id,
      userEmail: user.email ?? "unknown@enorsis.local",
      capability: capabilityByTask[task.type],
      input:
        `Agent: ${task.agent.name}\n` +
        `Task: ${task.title}\n` +
        `Policy boundary: advisory or draft output only; do not execute approvals, awards, contracts, orders, invoices, or payments.\n\n` +
        task.instruction,
      resourceType: task.resourceType ?? "AiAgentTask",
      resourceId: task.resourceId ?? task.id,
    });

    await prisma.$transaction([
      prisma.aiAgentTaskAttempt.update({
        where: { id: attempt.id },
        data: {
          aiExecutionId: execution.id,
          model: execution.model,
          status: "COMPLETED",
          outputSnapshot: {
            outputText: execution.outputText,
            confidence: execution.confidence,
          },
          completedAt: new Date(),
        },
      }),
      prisma.aiAgentTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          output: execution.outputText,
          confidence: execution.confidence,
          completedAt: new Date(),
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error.";

    await prisma.$transaction([
      prisma.aiAgentTaskAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      }),
      prisma.aiAgentTask.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: message,
        },
      }),
    ]);

    throw error;
  }

  revalidatePath(`/app/agents/control/${task.id}`);
  revalidatePath("/app/agents/control");
}
