import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { createEnterpriseNotification } from "@/core/notifications";
import { transitionRequisitionOrderJourney } from "./service";

export async function createApprovalRoute({
  journeyId,
  assessmentId,
  name,
  amount,
  currencyCode,
  initiatedByUserId,
  steps,
}: {
  journeyId: string;
  assessmentId?: string | null;
  name: string;
  amount?: number | null;
  currencyCode?: string;
  initiatedByUserId: string;
  steps: Array<{
    name: string;
    mode: "SEQUENTIAL" | "PARALLEL";
    requiredApprovals: number;
    approverUserIds: string[];
    dueAt?: Date | null;
  }>;
}) {
  const journey = await prisma.requisitionOrderJourney.findUniqueOrThrow({
    where: { id: journeyId },
  });

  if (steps.length === 0) {
    throw new Error("At least one approval step is required.");
  }

  const route = await prisma.requisitionApprovalRoute.create({
    data: {
      tenantId: journey.tenantId,
      journeyId,
      assessmentId: assessmentId ?? null,
      name,
      status: "ACTIVE",
      amount: amount ?? null,
      currencyCode: currencyCode ?? journey.currencyCode,
      initiatedByUserId,
      initiatedAt: new Date(),
      correlationId: journey.correlationId ?? randomUUID(),
      steps: {
        create: steps.map((step, index) => ({
          sequence: index + 1,
          name: step.name,
          mode: step.mode,
          requiredApprovals: step.requiredApprovals,
          dueAt: step.dueAt ?? null,
          decisions: {
            create: step.approverUserIds.map((approverUserId) => ({
              approverUserId,
              dueAt: step.dueAt ?? null,
            })),
          },
        })),
      },
    },
    include: { steps: { include: { decisions: true } } },
  });

  await transitionRequisitionOrderJourney({
    journeyId,
    status: "APPROVAL_PENDING",
    actorUserId: initiatedByUserId,
    description: "Approval route initiated.",
  });

  for (const decision of route.steps[0]?.decisions ?? []) {
    await createEnterpriseNotification({
      tenantId: journey.tenantId,
      eventType: "RequisitionApproval.Requested",
      recipientUserId: decision.approverUserId,
      title: "Requisition approval required",
      message: `${journey.journeyNumber} requires your approval.`,
      actionUrl: "/app/requisition-to-order",
      channels: ["IN_APP"],
      priority: "HIGH",
      correlationId: route.correlationId,
    });
  }

  return route;
}

export async function decideApproval({
  decisionId,
  actorUserId,
  action,
  comments,
}: {
  decisionId: string;
  actorUserId: string;
  action: "APPROVED" | "REJECTED";
  comments?: string | null;
}) {
  const decision = await prisma.requisitionApprovalDecision.findUniqueOrThrow({
    where: { id: decisionId },
    include: { step: { include: { route: true, decisions: true } } },
  });

  if (decision.approverUserId !== actorUserId) {
    throw new Error("This approval decision is assigned to another user.");
  }
  if (decision.status !== "PENDING") {
    throw new Error("This approval decision is no longer pending.");
  }

  await prisma.requisitionApprovalDecision.update({
    where: { id: decision.id },
    data: { status: action, comments: comments ?? null, decidedAt: new Date() },
  });

  if (action === "REJECTED") {
    await prisma.requisitionApprovalRoute.update({
      where: { id: decision.step.routeId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: comments ?? "Rejected by approver.",
      },
    });
    await transitionRequisitionOrderJourney({
      journeyId: decision.step.route.journeyId,
      status: "EXCEPTION",
      actorUserId,
      description: comments ?? "Approval rejected.",
    });
    return { status: "REJECTED" as const };
  }

  const refreshedStep = await prisma.requisitionApprovalStep.findUniqueOrThrow({
    where: { id: decision.stepId },
    include: { decisions: true, route: true },
  });
  const approvedCount = refreshedStep.decisions.filter(
    (item) => item.status === "APPROVED",
  ).length;

  if (approvedCount < refreshedStep.requiredApprovals) {
    return { status: "PENDING" as const };
  }

  await prisma.requisitionApprovalStep.update({
    where: { id: refreshedStep.id },
    data: { completedAt: new Date() },
  });

  const nextStep = await prisma.requisitionApprovalStep.findFirst({
    where: {
      routeId: refreshedStep.routeId,
      sequence: { gt: refreshedStep.sequence },
    },
    include: { decisions: true },
    orderBy: { sequence: "asc" },
  });

  if (nextStep) {
    await prisma.requisitionApprovalRoute.update({
      where: { id: refreshedStep.routeId },
      data: { currentSequence: nextStep.sequence },
    });
    return { status: "NEXT_STEP" as const };
  }

  const route = await prisma.requisitionApprovalRoute.update({
    where: { id: refreshedStep.routeId },
    data: { status: "APPROVED", completedAt: new Date() },
  });
  await transitionRequisitionOrderJourney({
    journeyId: route.journeyId,
    status: "APPROVED",
    actorUserId,
    description: "All required approvals completed.",
  });
  await publishDomainEvent({
    tenantId: route.tenantId,
    eventType: "RequisitionApproval.Completed",
    aggregateType: "RequisitionApprovalRoute",
    aggregateId: route.id,
    sourceModule: "requisition-to-order",
    correlationId: route.correlationId,
    actorUserId,
    payload: { journeyId: route.journeyId, routeId: route.id },
  });
  await recordEnterpriseActivity({
    tenantId: route.tenantId,
    activityType: "RequisitionApproval.Completed",
    sourceModule: "requisition-to-order",
    title: "Requisition approval completed",
    severity: "SUCCESS",
    actorUserId,
    subjectType: "RequisitionApprovalRoute",
    subjectId: route.id,
    actionUrl: "/app/requisition-to-order",
    correlationId: route.correlationId,
  });

  return { status: "APPROVED" as const };
}
