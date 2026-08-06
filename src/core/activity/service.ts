import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import type { EnterpriseActivityInput } from "./types";

export async function recordEnterpriseActivity(
  input: EnterpriseActivityInput,
) {
  return prisma.$transaction(async (tx) => {
    const activity = await tx.enterpriseActivity.create({
      data: {
        tenantId: input.tenantId,
        activityType: input.activityType,
        sourceModule: input.sourceModule,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity ?? "INFO",
        visibility: input.visibility ?? "TENANT",
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        actorRole: input.actorRole ?? null,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        subjectLabel: input.subjectLabel ?? null,
        parentType: input.parentType ?? null,
        parentId: input.parentId ?? null,
        actionUrl: input.actionUrl ?? null,
        eventId: input.eventId ?? null,
        correlationId: input.correlationId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: toJson(input.metadata ?? {}),
        occurredAt: input.occurredAt ?? new Date(),
      },
    });

    const accessRules = [
      ...(input.restrictedUserIds ?? []).map((userId) => ({
        activityId: activity.id,
        userId,
      })),
      ...(input.restrictedRoles ?? []).map((role) => ({
        activityId: activity.id,
        role,
      })),
    ];

    if (accessRules.length > 0) {
      await tx.enterpriseActivityAccessRule.createMany({
        data: accessRules,
      });
    }

    return activity;
  });
}

export async function recordActivityFromDomainEvent({
  tenantId,
  eventId,
  eventType,
  sourceModule,
  aggregateType,
  aggregateId,
  title,
  description,
  actorUserId,
  correlationId,
  metadata,
}: {
  tenantId: string;
  eventId?: string | null;
  eventType: string;
  sourceModule: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  title: string;
  description?: string | null;
  actorUserId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return recordEnterpriseActivity({
    tenantId,
    activityType: eventType,
    sourceModule,
    title,
    description,
    actorUserId,
    subjectType: aggregateType,
    subjectId: aggregateId,
    eventId,
    correlationId,
    metadata,
  });
}

export async function getEnterpriseActivityTimeline({
  tenantId,
  userId,
  userRoles,
  subjectType,
  subjectId,
  sourceModule,
  activityType,
  limit = 100,
}: {
  tenantId: string;
  userId: string;
  userRoles: readonly string[];
  subjectType?: string;
  subjectId?: string;
  sourceModule?: string;
  activityType?: string;
  limit?: number;
}) {
  return prisma.enterpriseActivity.findMany({
    where: {
      tenantId,
      ...(subjectType ? { subjectType } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(sourceModule ? { sourceModule } : {}),
      ...(activityType ? { activityType } : {}),
      OR: [
        { visibility: "TENANT" },
        {
          visibility: "PRIVATE",
          actorUserId: userId,
        },
        {
          visibility: "RESTRICTED",
          accessRules: {
            some: {
              active: true,
              OR: [
                { userId },
                { role: { in: [...userRoles] } },
              ],
              AND: [
                {
                  OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                  ],
                },
              ],
            },
          },
        },
        ...(userRoles.some((role) =>
          ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_AUDITOR"].includes(
            role,
          ),
        )
          ? [{ visibility: "PLATFORM" as const }]
          : []),
      ],
    },
    include: {
      accessRules: true,
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}
