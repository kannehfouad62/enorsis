import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

async function audit(input: {
  tenantId: string;
  approvalId: string;
  eventType: string;
  actorUserId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.governedExecutiveInsightApprovalAuditEvent.create({
    data: {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      description: input.description,
      metadata: toJson(input.metadata ?? {}),
    },
  });
}

export async function ensureGovernedExecutiveInsightApproval(input: {
  tenantId: string;
  insightId: string;
  actorUserId?: string | null;
}) {
  const insight =
    await prisma.governedExecutiveInsight.findFirstOrThrow({
      where: {
        id: input.insightId,
        tenantId: input.tenantId,
      },
    });

  const approval =
    await prisma.governedExecutiveInsightApproval.upsert({
      where: {
        tenantId_insightId: {
          tenantId: input.tenantId,
          insightId: insight.id,
        },
      },
      create: {
        tenantId: input.tenantId,
        insightId: insight.id,
        status: "PENDING_REVIEW",
      },
      update: {},
    });

  const existingEvents =
    await prisma.governedExecutiveInsightApprovalAuditEvent.count({
      where: { approvalId: approval.id },
    });

  if (existingEvents === 0) {
    await audit({
      tenantId: input.tenantId,
      approvalId: approval.id,
      actorUserId: input.actorUserId ?? null,
      eventType: "APPROVAL_CREATED",
      description: "Governed executive AI approval record created.",
      metadata: {
        insightId: insight.id,
        requiresHumanReview: insight.requiresHumanReview,
        severity: insight.severity,
      },
    });
  }

  return approval;
}

export async function assignGovernedExecutiveInsightReviewer(input: {
  tenantId: string;
  insightId: string;
  reviewerUserId: string;
  actorUserId: string;
  dueAt?: Date | null;
}) {
  const approval =
    await ensureGovernedExecutiveInsightApproval({
      tenantId: input.tenantId,
      insightId: input.insightId,
      actorUserId: input.actorUserId,
    });

  const updated =
    await prisma.governedExecutiveInsightApproval.update({
      where: { id: approval.id },
      data: {
        status: "IN_REVIEW",
        assignedReviewerUserId: input.reviewerUserId,
        assignedAt: new Date(),
        dueAt: input.dueAt ?? null,
      },
    });

  await audit({
    tenantId: input.tenantId,
    approvalId: approval.id,
    actorUserId: input.actorUserId,
    eventType: "REVIEWER_ASSIGNED",
    description: "Executive AI insight assigned for human review.",
    metadata: {
      reviewerUserId: input.reviewerUserId,
      dueAt: input.dueAt?.toISOString() ?? null,
    },
  });

  return updated;
}

export async function decideGovernedExecutiveInsightApproval(input: {
  tenantId: string;
  insightId: string;
  actorUserId: string;
  decision:
    | "APPROVE"
    | "REJECT"
    | "REQUEST_CHANGES"
    | "ESCALATE";
  comment?: string | null;
}) {
  const approval =
    await ensureGovernedExecutiveInsightApproval({
      tenantId: input.tenantId,
      insightId: input.insightId,
      actorUserId: input.actorUserId,
    });

  const decision =
    await prisma.governedExecutiveInsightApprovalDecision.create({
      data: {
        tenantId: input.tenantId,
        approvalId: approval.id,
        decision: input.decision,
        decidedByUserId: input.actorUserId,
        comment: input.comment ?? null,
      },
    });

  const nextStatus =
    input.decision === "APPROVE"
      ? "APPROVED"
      : input.decision === "REJECT"
        ? "REJECTED"
        : input.decision === "REQUEST_CHANGES"
          ? "CHANGES_REQUESTED"
          : "ESCALATED";

  const updated =
    await prisma.governedExecutiveInsightApproval.update({
      where: { id: approval.id },
      data: {
        status: nextStatus,
        currentDecisionId: decision.id,
        escalatedAt:
          input.decision === "ESCALATE" ? new Date() : approval.escalatedAt,
        escalationReason:
          input.decision === "ESCALATE"
            ? input.comment ?? "Escalated by reviewer."
            : approval.escalationReason,
      },
    });

  await audit({
    tenantId: input.tenantId,
    approvalId: approval.id,
    actorUserId: input.actorUserId,
    eventType: `DECISION_${input.decision}`,
    description: `Human review decision recorded: ${input.decision}.`,
    metadata: {
      decisionId: decision.id,
      comment: input.comment ?? null,
    },
  });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "GovernedExecutiveAI.ApprovalDecisionRecorded",
    aggregateType: "GovernedExecutiveInsightApproval",
    aggregateId: approval.id,
    sourceModule: "governed-executive-ai",
    actorUserId: input.actorUserId,
    payload: {
      insightId: input.insightId,
      approvalId: approval.id,
      decision: input.decision,
      status: nextStatus,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "GovernedExecutiveAI.ApprovalDecisionRecorded",
    sourceModule: "governed-executive-ai",
    title: "Executive AI approval decision recorded",
    description: `${input.decision} · ${input.insightId}`,
    severity:
      input.decision === "REJECT" || input.decision === "ESCALATE"
        ? "WARNING"
        : "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "GovernedExecutiveInsightApproval",
    subjectId: approval.id,
    subjectLabel: input.insightId,
    actionUrl: "/app/executive/ai-governance",
  });

  return updated;
}

export async function escalateOverdueGovernedExecutiveApprovals(input: {
  tenantId: string;
  actorUserId?: string | null;
}) {
  const now = new Date();

  const overdue =
    await prisma.governedExecutiveInsightApproval.findMany({
      where: {
        tenantId: input.tenantId,
        status: {
          in: ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"],
        },
        dueAt: {
          lt: now,
        },
      },
    });

  for (const approval of overdue) {
    await prisma.governedExecutiveInsightApproval.update({
      where: { id: approval.id },
      data: {
        status: "ESCALATED",
        escalatedAt: now,
        escalationReason: "Human review SLA exceeded.",
      },
    });

    await audit({
      tenantId: input.tenantId,
      approvalId: approval.id,
      actorUserId: input.actorUserId ?? null,
      eventType: "AUTO_ESCALATED",
      description: "Approval automatically escalated because review SLA expired.",
      metadata: {
        dueAt: approval.dueAt?.toISOString() ?? null,
      },
    });
  }

  return {
    escalated: overdue.length,
  };
}
