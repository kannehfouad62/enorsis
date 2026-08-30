import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { toJson } from "@/lib/prisma-json";

type JourneyStatus =
  | "DRAFT"
  | "REQUISITION_SUBMITTED"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ORDER_PENDING"
  | "ORDER_ISSUED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED"
  | "CANCELLED"
  | "EXCEPTION";

export async function createRequisitionOrderJourney(input: {
  tenantId: string;
  title: string;
  description?: string | null;
  requesterUserId?: string | null;
  currencyCode?: string;
  estimatedAmount?: number | null;
  requiredByDate?: Date | null;
}) {
  const count = await prisma.requisitionOrderJourney.count({
    where: { tenantId: input.tenantId },
  });

  const journeyNumber = `RTO-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const journey = await prisma.requisitionOrderJourney.create({
    data: {
      tenantId: input.tenantId,
      journeyNumber,
      title: input.title,
      description: input.description ?? null,
      requesterUserId: input.requesterUserId ?? null,
      ownerUserId: input.requesterUserId ?? null,
      currencyCode: input.currencyCode ?? "USD",
      estimatedAmount: input.estimatedAmount ?? null,
      requiredByDate: input.requiredByDate ?? null,
      correlationId: randomUUID(),
      milestones: {
        create: {
          milestoneType: "REQUISITION_CREATED",
          title: "Requisition journey created",
          actorUserId: input.requesterUserId ?? null,
          sourceModule: "requisition-to-order",
        },
      },
    },
  });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "RequisitionOrderJourney.Created",
    aggregateType: "RequisitionOrderJourney",
    aggregateId: journey.id,
    sourceModule: "requisition-to-order",
    correlationId: journey.correlationId,
    actorUserId: input.requesterUserId ?? null,
    payload: {
      journeyId: journey.id,
      journeyNumber: journey.journeyNumber,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "RequisitionOrderJourney.Created",
    sourceModule: "requisition-to-order",
    title: "Requisition-to-order journey created",
    description: `${journey.journeyNumber}: ${journey.title}`,
    severity: "SUCCESS",
    actorUserId: input.requesterUserId ?? null,
    subjectType: "RequisitionOrderJourney",
    subjectId: journey.id,
    subjectLabel: journey.journeyNumber,
    actionUrl: "/app/requisition-to-order",
    correlationId: journey.correlationId,
  });

  return journey;
}

export async function transitionRequisitionOrderJourney(input: {
  journeyId: string;
  status: JourneyStatus;
  actorUserId?: string | null;
  description?: string | null;
}) {
  const existing =
    await prisma.requisitionOrderJourney.findUniqueOrThrow({
      where: { id: input.journeyId },
    });

  const milestoneMap = {
    REQUISITION_SUBMITTED: "REQUISITION_SUBMITTED",
    APPROVAL_PENDING: "APPROVAL_REQUESTED",
    APPROVED: "APPROVAL_COMPLETED",
    ORDER_PENDING: "ORDER_CREATED",
    ORDER_ISSUED: "ORDER_ISSUED",
    PARTIALLY_RECEIVED: "RECEIPT_RECORDED",
    RECEIVED: "RECEIPT_RECORDED",
    CLOSED: "JOURNEY_CLOSED",
    CANCELLED: "JOURNEY_CANCELLED",
  } as const;

  const milestoneType =
    milestoneMap[input.status as keyof typeof milestoneMap];
  const now = new Date();

  const journey = await prisma.requisitionOrderJourney.update({
    where: { id: input.journeyId },
    data: {
      status: input.status,
      submittedAt:
        input.status === "REQUISITION_SUBMITTED"
          ? existing.submittedAt ?? now
          : undefined,
      approvedAt:
        input.status === "APPROVED"
          ? existing.approvedAt ?? now
          : undefined,
      orderedAt:
        input.status === "ORDER_ISSUED"
          ? existing.orderedAt ?? now
          : undefined,
      receivedAt:
        input.status === "RECEIVED"
          ? existing.receivedAt ?? now
          : undefined,
      closedAt:
        input.status === "CLOSED"
          ? existing.closedAt ?? now
          : undefined,
      cancelledAt:
        input.status === "CANCELLED"
          ? existing.cancelledAt ?? now
          : undefined,
      milestones: milestoneType
        ? {
            create: {
              milestoneType,
              title: input.status.replaceAll("_", " "),
              description: input.description ?? null,
              actorUserId: input.actorUserId ?? null,
              sourceModule: "requisition-to-order",
              metadata: toJson({
                previousStatus: existing.status,
                nextStatus: input.status,
              }),
            },
          }
        : undefined,
    },
  });

  await publishDomainEvent({
    tenantId: journey.tenantId,
    eventType: "RequisitionOrderJourney.StatusChanged",
    aggregateType: "RequisitionOrderJourney",
    aggregateId: journey.id,
    sourceModule: "requisition-to-order",
    correlationId: journey.correlationId,
    actorUserId: input.actorUserId ?? null,
    payload: {
      journeyId: journey.id,
      previousStatus: existing.status,
      status: input.status,
    },
  });

  return journey;
}

export async function raiseRequisitionOrderException(input: {
  journeyId: string;
  code: string;
  title: string;
  description?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  actorUserId?: string | null;
}) {
  const journey =
    await prisma.requisitionOrderJourney.findUniqueOrThrow({
      where: { id: input.journeyId },
    });

  const exception = await prisma.$transaction(async (tx) => {
    const created = await tx.requisitionOrderException.create({
      data: {
        journeyId: input.journeyId,
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity,
        ownerUserId: input.actorUserId ?? null,
        sourceModule: "requisition-to-order",
      },
    });

    await tx.requisitionOrderJourney.update({
      where: { id: input.journeyId },
      data: {
        status: "EXCEPTION",
        milestones: {
          create: {
            milestoneType: "EXCEPTION_RAISED",
            title: input.title,
            description: input.description ?? null,
            actorUserId: input.actorUserId ?? null,
            sourceModule: "requisition-to-order",
            sourceRecordId: created.id,
          },
        },
      },
    });

    return created;
  });

  await publishDomainEvent({
    tenantId: journey.tenantId,
    eventType: "RequisitionOrderJourney.ExceptionRaised",
    aggregateType: "RequisitionOrderException",
    aggregateId: exception.id,
    sourceModule: "requisition-to-order",
    correlationId: journey.correlationId,
    actorUserId: input.actorUserId ?? null,
    payload: {
      journeyId: input.journeyId,
      exceptionId: exception.id,
      code: input.code,
      severity: input.severity,
    },
  });

  return exception;
}

export async function updateRequisitionOrderException(input: {
  exceptionId: string;
  actorUserId?: string | null;
  ownerUserId?: string | null;
  status:
    | "OPEN"
    | "INVESTIGATING"
    | "RESOLVED";
  note?: string | null;
}) {
  const existing =
    await prisma.requisitionOrderException.findUniqueOrThrow({
      where: { id: input.exceptionId },
      include: {
        journey: true,
      },
    });

  const updated =
    await prisma.requisitionOrderException.update({
      where: { id: input.exceptionId },
      data: {
        status: input.status,
        ownerUserId:
          input.ownerUserId === undefined
            ? undefined
            : input.ownerUserId,
      },
    });

  await prisma.requisitionOrderMilestone.create({
    data: {
      journeyId: existing.journeyId,
      milestoneType:
        input.status === "RESOLVED"
          ? "EXCEPTION_RESOLVED"
          : "EXCEPTION_RAISED",
      title: `Exception ${input.status.replaceAll("_", " ")}`,
      description: input.note ?? null,
      actorUserId: input.actorUserId ?? null,
      sourceModule: "requisition-to-order",
      sourceRecordId: existing.id,
      metadata: toJson({
        exceptionId: existing.id,
        code: existing.code,
        previousStatus: existing.status,
        nextStatus: input.status,
        ownerUserId:
          input.ownerUserId ?? existing.ownerUserId,
      }),
    },
  });

  await publishDomainEvent({
    tenantId: existing.journey.tenantId,
    eventType: "RequisitionOrderJourney.ExceptionUpdated",
    aggregateType: "RequisitionOrderException",
    aggregateId: existing.id,
    sourceModule: "requisition-to-order",
    correlationId: existing.journey.correlationId,
    actorUserId: input.actorUserId ?? null,
    payload: {
      journeyId: existing.journeyId,
      exceptionId: existing.id,
      previousStatus: existing.status,
      status: input.status,
      ownerUserId:
        input.ownerUserId ?? existing.ownerUserId,
    },
  });

  await recordEnterpriseActivity({
    tenantId: existing.journey.tenantId,
    activityType: "RequisitionOrderJourney.ExceptionUpdated",
    sourceModule: "requisition-to-order",
    title: `RTO exception ${input.status.toLowerCase()}`,
    description:
      input.note ??
      `${existing.code}: ${existing.title}`,
    severity:
      input.status === "RESOLVED"
        ? "SUCCESS"
        : "INFO",
    actorUserId: input.actorUserId ?? null,
    subjectType: "RequisitionOrderException",
    subjectId: existing.id,
    subjectLabel: existing.code,
    actionUrl:
      "/app/requisition-to-order/assurance",
    correlationId: existing.journey.correlationId,
  });

  return updated;
}
