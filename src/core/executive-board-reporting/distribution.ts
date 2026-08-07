import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createExecutiveBoardRecipientGroup(input: {
  tenantId: string;
  name: string;
  groupType:
    | "BOARD"
    | "AUDIT_COMMITTEE"
    | "RISK_COMMITTEE"
    | "PROCUREMENT_COMMITTEE"
    | "FINANCE_COMMITTEE"
    | "EXECUTIVE_LEADERSHIP"
    | "CUSTOM";
  description?: string | null;
  actorUserId: string;
}) {
  return prisma.executiveBoardRecipientGroup.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      groupType: input.groupType,
      description: input.description ?? null,
      createdByUserId: input.actorUserId,
    },
  });
}

export async function addExecutiveBoardRecipient(input: {
  tenantId: string;
  groupId: string;
  name: string;
  email: string;
  title?: string | null;
  organization?: string | null;
  userId?: string | null;
}) {
  const group = await prisma.executiveBoardRecipientGroup.findFirstOrThrow({
    where: {
      id: input.groupId,
      tenantId: input.tenantId,
    },
  });

  return prisma.executiveBoardRecipient.upsert({
    where: {
      groupId_email: {
        groupId: group.id,
        email: input.email.toLowerCase(),
      },
    },
    create: {
      tenantId: input.tenantId,
      groupId: group.id,
      name: input.name,
      email: input.email.toLowerCase(),
      title: input.title ?? null,
      organization: input.organization ?? null,
      userId: input.userId ?? null,
      status: "ACTIVE",
    },
    update: {
      name: input.name,
      title: input.title ?? null,
      organization: input.organization ?? null,
      userId: input.userId ?? null,
      status: "ACTIVE",
    },
  });
}

export async function createExecutiveBoardDistribution(input: {
  tenantId: string;
  boardPackId: string;
  recipientGroupId: string;
  actorUserId: string;
  subject?: string | null;
  message?: string | null;
}) {
  const [pack, group] = await Promise.all([
    prisma.executiveBoardPack.findFirstOrThrow({
      where: {
        id: input.boardPackId,
        tenantId: input.tenantId,
      },
    }),
    prisma.executiveBoardRecipientGroup.findFirstOrThrow({
      where: {
        id: input.recipientGroupId,
        tenantId: input.tenantId,
        active: true,
      },
      include: {
        members: {
          where: { status: "ACTIVE" },
        },
      },
    }),
  ]);

  if (pack.status !== "FINALIZED") {
    throw new Error("Only finalized board packs can be distributed.");
  }

  if (group.members.length === 0) {
    throw new Error("The recipient group has no active members.");
  }

  const count = await prisma.executiveBoardDistribution.count({
    where: { tenantId: input.tenantId },
  });

  const distributionNumber = `DST-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(7, "0")}`;

  const distribution = await prisma.executiveBoardDistribution.create({
    data: {
      tenantId: input.tenantId,
      boardPackId: pack.id,
      recipientGroupId: group.id,
      distributionNumber,
      subject:
        input.subject?.trim() ||
        `${pack.title} — Enorsis Board Pack`,
      message: input.message ?? null,
      initiatedByUserId: input.actorUserId,
      status: "PENDING",
    },
  });

  for (const member of group.members) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.executiveBoardDelivery.create({
      data: {
        tenantId: input.tenantId,
        distributionId: distribution.id,
        recipientId: member.id,
        status: "PENDING",
        accessTokenHash: tokenHash(token),
      },
    });
  }

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "ExecutiveBoardReporting.DistributionCreated",
    aggregateType: "ExecutiveBoardDistribution",
    aggregateId: distribution.id,
    sourceModule: "executive-board-reporting",
    actorUserId: input.actorUserId,
    payload: {
      distributionId: distribution.id,
      distributionNumber,
      boardPackId: pack.id,
      recipientGroupId: group.id,
      recipientCount: group.members.length,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ExecutiveBoardReporting.DistributionCreated",
    sourceModule: "executive-board-reporting",
    title: "Board-pack distribution created",
    description: `${distributionNumber} · ${group.name}`,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ExecutiveBoardDistribution",
    subjectId: distribution.id,
    subjectLabel: distributionNumber,
    actionUrl: "/app/executive/board-distribution",
  });

  return distribution;
}

export async function markExecutiveBoardDistributionSent(input: {
  tenantId: string;
  distributionId: string;
  actorUserId: string;
}) {
  const distribution =
    await prisma.executiveBoardDistribution.findFirstOrThrow({
      where: {
        id: input.distributionId,
        tenantId: input.tenantId,
      },
    });

  const now = new Date();

  await prisma.executiveBoardDelivery.updateMany({
    where: {
      distributionId: distribution.id,
      status: "PENDING",
    },
    data: {
      status: "SENT",
      sentAt: now,
    },
  });

  return prisma.executiveBoardDistribution.update({
    where: { id: distribution.id },
    data: {
      status: "SENT",
      completedAt: now,
    },
  });
}

export async function recordBoardDeliveryAccess(input: {
  tenantId: string;
  deliveryId: string;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const delivery =
    await prisma.executiveBoardDelivery.findFirstOrThrow({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
      },
    });

  const now = new Date();

  if (
    input.eventType === "OPENED" &&
    delivery.status !== "REVOKED"
  ) {
    await prisma.executiveBoardDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "OPENED",
        openedAt: delivery.openedAt ?? now,
      },
    });
  }

  return prisma.executiveBoardDeliveryAccessEvent.create({
    data: {
      tenantId: input.tenantId,
      deliveryId: delivery.id,
      eventType: input.eventType,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function revokeExecutiveBoardDelivery(input: {
  tenantId: string;
  deliveryId: string;
  actorUserId: string;
}) {
  const delivery =
    await prisma.executiveBoardDelivery.findFirstOrThrow({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
      },
    });

  const updated =
    await prisma.executiveBoardDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ExecutiveBoardReporting.DeliveryRevoked",
    sourceModule: "executive-board-reporting",
    title: "Board-pack recipient access revoked",
    description: delivery.id,
    severity: "WARNING",
    actorUserId: input.actorUserId,
    subjectType: "ExecutiveBoardDelivery",
    subjectId: delivery.id,
    subjectLabel: delivery.id,
    actionUrl: "/app/executive/board-distribution",
  });

  return updated;
}
