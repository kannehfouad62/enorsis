"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function transitionSourcingEventAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const targetStatus = value(formData, "targetStatus");

  const allowed = new Set([
    "DRAFT",
    "PUBLISHED",
    "OPEN",
    "EVALUATION",
    "CANCELLED",
    "CLOSED",
  ]);

  if (!allowed.has(targetStatus)) {
    throw new Error("Unsupported sourcing event status.");
  }

  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: { id: eventId, tenantId: user.tenantId },
  });

  await prisma.$transaction([
    prisma.sourcingEvent.update({
      where: { id: event.id },
      data: {
        status: targetStatus as
          | "DRAFT"
          | "PUBLISHED"
          | "OPEN"
          | "EVALUATION"
          | "CANCELLED"
          | "CLOSED",
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "sourcing_event.transition",
        resourceType: "SourcingEvent",
        resourceId: event.id,
        before: { status: event.status },
        after: { status: targetStatus },
      },
    }),
  ]);

  revalidatePath(`/app/sourcing/${event.id}`);
  revalidatePath(`/app/sourcing/${event.id}/evaluation`);
}

export async function assignSourcingEvaluatorAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const evaluatorUserId = value(formData, "evaluatorUserId");

  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: { id: eventId, tenantId: user.tenantId },
  });

  const membership = await prisma.membership.findFirstOrThrow({
    where: {
      tenantId: user.tenantId,
      userId: evaluatorUserId,
      status: "ACTIVE",
    },
  });

  await prisma.sourcingEvaluator.upsert({
    where: {
      sourcingEventId_userId: {
        sourcingEventId: event.id,
        userId: membership.userId,
      },
    },
    update: {
      status: "ASSIGNED",
      assignedByUserId: user.id,
      assignedAt: new Date(),
      completedAt: null,
    },
    create: {
      sourcingEventId: event.id,
      userId: membership.userId,
      status: "ASSIGNED",
      assignedByUserId: user.id,
    },
  });

  revalidatePath(`/app/sourcing/${event.id}/governance`);
}

export async function openNegotiationRoundAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const title = value(formData, "title");
  const instructions = value(formData, "instructions");
  const closesAt = value(formData, "closesAt");

  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: { id: eventId, tenantId: user.tenantId },
    include: { rounds: true },
  });

  if (!event.allowMultipleRounds) {
    throw new Error("Multiple rounds are not enabled for this sourcing event.");
  }

  const nextRound = Math.max(
    event.currentRound + 1,
    event.rounds.length + 1,
  );

  await prisma.$transaction([
    prisma.sourcingRound.create({
      data: {
        sourcingEventId: event.id,
        roundNumber: nextRound,
        status: "OPEN",
        title,
        instructions: instructions || null,
        opensAt: new Date(),
        openedAt: new Date(),
        closesAt: closesAt ? new Date(closesAt) : null,
        createdByUserId: user.id,
      },
    }),
    prisma.sourcingEvent.update({
      where: { id: event.id },
      data: {
        currentRound: nextRound,
        status: "OPEN",
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "sourcing_round.open",
        resourceType: "SourcingEvent",
        resourceId: event.id,
        after: { roundNumber: nextRound, title },
      },
    }),
  ]);

  revalidatePath(`/app/sourcing/${event.id}/governance`);
}

export async function closeNegotiationRoundAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const roundId = value(formData, "roundId");

  const round = await prisma.sourcingRound.findFirstOrThrow({
    where: {
      id: roundId,
      event: { tenantId: user.tenantId },
    },
  });

  await prisma.sourcingRound.update({
    where: { id: round.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  revalidatePath(`/app/sourcing/${round.sourcingEventId}/governance`);
}
