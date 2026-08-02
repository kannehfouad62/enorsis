import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashSupplierPortalToken } from "./portal-token";

export async function getSupplierPortalEvent(token: string) {
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
    redirect("/supplier/sourcing/invalid");
  }

  const [questions, response, attachments] = await Promise.all([
    prisma.sourcingQuestion.findMany({
      where: {
        sourcingEventId: invitation.sourcingEventId,
        supplierId: invitation.supplierId,
      },
      orderBy: { askedAt: "desc" },
    }),
    prisma.sourcingResponse.findUnique({
      where: {
        sourcingEventId_supplierId_round: {
          sourcingEventId: invitation.sourcingEventId,
          supplierId: invitation.supplierId,
          round: invitation.event.currentRound,
        },
      },
    }),
    prisma.sourcingAttachment.findMany({
      where: {
        sourcingEventId: invitation.sourcingEventId,
        supplierId: invitation.supplierId,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { invitation, questions, response, attachments };
}

export async function getSourcingPortalGovernance(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [event, members] = await Promise.all([
    prisma.sourcingEvent.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        invitations: {
          include: { supplier: true },
          orderBy: { invitedAt: "asc" },
        },
        questions: {
          include: { supplier: true },
          orderBy: { askedAt: "desc" },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
        },
        sealedBidOpening: true,
        responses: {
          where: { status: "SUBMITTED" },
        },
      },
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!event) redirect("/app/sourcing");
  return { session, event, members };
}
