"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  createSupplierPortalToken,
  hashSupplierPortalToken,
} from "./portal-token";
import { uploadPrivateSourcingAttachment } from "./portal-documents";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function createSupplierPortalAccessAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invitationId = value(formData, "invitationId");
  const invitation = await prisma.sourcingInvitation.findFirstOrThrow({
    where: {
      id: invitationId,
      event: { tenantId: user.tenantId },
    },
  });

  const created = createSupplierPortalToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.sourcingInvitation.update({
    where: { id: invitation.id },
    data: {
      accessTokenHash: created.tokenHash,
      accessExpiresAt: expiresAt,
      accessRevokedAt: null,
    },
  });

  console.info(
    `[Enorsis supplier portal] invitation=${invitation.id} token=${created.token}`,
  );

  revalidatePath(`/app/sourcing/${invitation.sourcingEventId}/portal`);
}

export async function askSourcingQuestionAction(formData: FormData) {
  const token = value(formData, "token");
  const question = value(formData, "question").trim();

  if (question.length < 5) {
    throw new Error("Question must be at least 5 characters.");
  }

  const invitation = await prisma.sourcingInvitation.findUnique({
    where: { accessTokenHash: hashSupplierPortalToken(token) },
    include: { event: true },
  });

  if (
    !invitation ||
    invitation.accessRevokedAt ||
    !invitation.accessExpiresAt ||
    invitation.accessExpiresAt <= new Date()
  ) {
    throw new Error("Supplier invitation is invalid or expired.");
  }

  await prisma.sourcingQuestion.create({
    data: {
      sourcingEventId: invitation.sourcingEventId,
      supplierId: invitation.supplierId,
      question,
    },
  });

  revalidatePath(`/supplier/sourcing/${token}`);
}

export async function answerSourcingQuestionAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const questionId = value(formData, "questionId");
  const answer = value(formData, "answer").trim();

  const question = await prisma.sourcingQuestion.findFirstOrThrow({
    where: {
      id: questionId,
      event: { tenantId: user.tenantId },
    },
  });

  await prisma.sourcingQuestion.update({
    where: { id: question.id },
    data: {
      answer,
      status: "ANSWERED",
      answeredAt: new Date(),
      answeredByUserId: user.id,
    },
  });

  revalidatePath(`/app/sourcing/${question.sourcingEventId}/portal`);
}

export async function uploadSupplierResponseAttachmentAction(
  formData: FormData,
) {
  const token = value(formData, "token");

  const invitation = await prisma.sourcingInvitation.findUnique({
    where: { accessTokenHash: hashSupplierPortalToken(token) },
    include: {
      event: true,
      supplier: true,
    },
  });

  if (
    !invitation ||
    invitation.accessRevokedAt ||
    !invitation.accessExpiresAt ||
    invitation.accessExpiresAt <= new Date()
  ) {
    throw new Error("Supplier invitation is invalid or expired.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("A response attachment is required.");
  }

  const response = await prisma.sourcingResponse.findUnique({
    where: {
      sourcingEventId_supplierId_round: {
        sourcingEventId: invitation.sourcingEventId,
        supplierId: invitation.supplierId,
        round: invitation.event.currentRound,
      },
    },
  });

  const blob = await uploadPrivateSourcingAttachment(
    invitation.event.tenantId,
    invitation.event.id,
    file,
  );

  await prisma.sourcingAttachment.create({
    data: {
      sourcingEventId: invitation.event.id,
      responseId: response?.id ?? null,
      supplierId: invitation.supplierId,
      type: "RESPONSE",
      name: file.name,
      blobPathname: blob.pathname,
      storageUrl: blob.url,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedByLabel:
        invitation.supplier.tradingName ?? invitation.supplier.legalName,
    },
  });

  revalidatePath(`/supplier/sourcing/${token}`);
}

export async function openSealedBidsAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const notes = value(formData, "openingNotes");
  const witnesses = formData
    .getAll("witnessUserIds")
    .map(String)
    .filter(Boolean);

  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: {
      id: eventId,
      tenantId: user.tenantId,
      sealedResponses: true,
    },
    include: {
      responses: {
        where: { status: "SUBMITTED" },
      },
    },
  });

  await prisma.$transaction([
    prisma.sealedBidOpening.upsert({
      where: { sourcingEventId: event.id },
      update: {
        status: "OPENED",
        openedAt: new Date(),
        openedByUserId: user.id,
        witnessUserIds: witnesses,
        openingNotes: notes || null,
        responseCount: event.responses.length,
      },
      create: {
        sourcingEventId: event.id,
        status: "OPENED",
        openedAt: new Date(),
        openedByUserId: user.id,
        witnessUserIds: witnesses,
        openingNotes: notes || null,
        responseCount: event.responses.length,
      },
    }),
    prisma.sourcingEvent.update({
      where: { id: event.id },
      data: { status: "EVALUATION" },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "sourcing_sealed_bids.open",
        resourceType: "SourcingEvent",
        resourceId: event.id,
        after: {
          responseCount: event.responses.length,
          witnessUserIds: witnesses,
        },
      },
    }),
  ]);

  revalidatePath(`/app/sourcing/${event.id}/portal`);
  revalidatePath(`/app/sourcing/${event.id}/evaluation`);
}
