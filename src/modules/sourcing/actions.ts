"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { createSourcingEventSchema, submitResponseSchema } from "./schemas";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function createSourcingEventAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN", "TENANT_OWNER",
  ]);

  const input = createSourcingEventSchema.parse({
    type: value(formData, "type"),
    title: value(formData, "title"),
    summary: value(formData, "summary"),
    scopeOfWork: value(formData, "scopeOfWork"),
    currencyCode: value(formData, "currencyCode"),
    estimatedValue: value(formData, "estimatedValue") || undefined,
    responseDeadline: value(formData, "responseDeadline"),
    supplierIds: formData.getAll("supplierIds").map(String).filter(Boolean),
  });

  const count = await prisma.sourcingEvent.count({
    where: { tenantId: user.tenantId },
  });

  const event = await prisma.sourcingEvent.create({
    data: {
      tenantId: user.tenantId,
      eventNumber: `SRC-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      type: input.type,
      status: "PUBLISHED",
      title: input.title,
      summary: input.summary,
      scopeOfWork: input.scopeOfWork,
      currencyCode: input.currencyCode,
      estimatedValue: input.estimatedValue,
      responseDeadline: input.responseDeadline ? new Date(input.responseDeadline) : null,
      publishedAt: new Date(),
      invitations: {
        create: input.supplierIds.map((supplierId) => ({ supplierId })),
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
      action: "sourcing_event.create",
      resourceType: "SourcingEvent",
      resourceId: event.id,
      after: { eventNumber: event.eventNumber, type: event.type },
    },
  });

  revalidatePath("/app/sourcing");
}

export async function submitSourcingResponseAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER", "BUYER", "PROCUREMENT_MANAGER",
    "TENANT_ADMIN", "TENANT_OWNER",
  ]);

  const input = submitResponseSchema.parse({
    sourcingEventId: value(formData, "sourcingEventId"),
    supplierId: value(formData, "supplierId"),
    currencyCode: value(formData, "currencyCode"),
    totalBid: value(formData, "totalBid"),
    deliveryDays: value(formData, "deliveryDays"),
    technicalResponse: value(formData, "technicalResponse"),
  });

  const invitation = await prisma.sourcingInvitation.findFirstOrThrow({
    where: {
      sourcingEventId: input.sourcingEventId,
      supplierId: input.supplierId,
      event: { tenantId: user.tenantId },
    },
    include: { event: true },
  });

  await prisma.sourcingResponse.upsert({
    where: {
      sourcingEventId_supplierId_round: {
        sourcingEventId: invitation.sourcingEventId,
        supplierId: invitation.supplierId,
        round: invitation.event.currentRound,
      },
    },
    update: {
      status: "SUBMITTED",
      currencyCode: input.currencyCode,
      totalBid: input.totalBid,
      deliveryDays: input.deliveryDays,
      technicalResponse: input.technicalResponse,
      submittedAt: new Date(),
    },
    create: {
      sourcingEventId: invitation.sourcingEventId,
      supplierId: invitation.supplierId,
      round: invitation.event.currentRound,
      status: "SUBMITTED",
      currencyCode: input.currencyCode,
      totalBid: input.totalBid,
      deliveryDays: input.deliveryDays,
      technicalResponse: input.technicalResponse,
      submittedAt: new Date(),
    },
  });

  await prisma.sourcingInvitation.update({
    where: { id: invitation.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  revalidatePath(`/app/sourcing/${invitation.sourcingEventId}`);
}
