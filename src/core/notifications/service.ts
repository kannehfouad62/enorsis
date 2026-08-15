import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { toJson } from "@/lib/prisma-json";
import { getNotificationProvider } from "./providers";
import type { CreateNotificationInput } from "./types";

export async function createEnterpriseNotification(
  input: CreateNotificationInput,
) {
  const channels =
    input.channels && input.channels.length > 0
      ? input.channels
      : (["IN_APP"] as const);

  const notification = await prisma.$transaction(
    async (tx) => {
      const created =
        await tx.enterpriseNotification.create({
          data: {
            tenantId: input.tenantId,
            templateId: input.templateId ?? null,
            eventId: input.eventId ?? null,
            eventType: input.eventType,
            recipientUserId:
              input.recipientUserId ?? null,
            recipientAddress:
              input.recipientAddress ?? null,
            title: input.title,
            message: input.message,
            actionUrl: input.actionUrl ?? null,
            priority: input.priority ?? "NORMAL",
            data: toJson(input.data ?? {}),
            correlationId:
              input.correlationId ?? null,
          },
        });

      await tx.enterpriseNotificationDelivery.createMany({
        data: channels.map((channel) => ({
          notificationId: created.id,
          channel,
          destination:
            channel === "EMAIL"
              ? input.recipientAddress ?? null
              : input.recipientUserId ?? null,
        })),
      });

      return created;
    },
  );

  // Immediate delivery is best-effort. The delivery engine
  // persists provider errors and schedules retries without
  // rolling back the business action that created the notification.
  try {
    await deliverEnterpriseNotificationNow(
      notification.id,
    );
  } catch (error) {
    console.error(
      "Immediate enterprise notification delivery failed",
      {
        notificationId: notification.id,
        eventType: notification.eventType,
        error,
      },
    );
  }

  return notification;
}

export async function processPendingNotificationDeliveries({
  limit = 50,
}: {
  limit?: number;
}) {
  const deliveries =
    await prisma.enterpriseNotificationDelivery.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      include: { notification: true },
      orderBy: { availableAt: "asc" },
      take: limit,
    });

  const results = [];

  for (const delivery of deliveries) {
    const claimed =
      await prisma.enterpriseNotificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: "PENDING",
        },
        data: {
          status: "PROCESSING",
          processingAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

    if (claimed.count === 0) continue;

    results.push(await deliverNotification(delivery.id));
  }

  return results;
}

async function deliverNotification(deliveryId: string) {
  const delivery =
    await prisma.enterpriseNotificationDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { notification: true },
    });

  try {
    if (delivery.channel === "IN_APP") {
      await completeDelivery(delivery.id, {
        provider: "ENORSIS_IN_APP",
      });
    } else {
      const provider =
        await getNotificationProvider(
          delivery.channel,
        );

      if (!provider) {
        throw new Error(
          `No notification provider registered for ${delivery.channel}.`,
        );
      }

      if (!delivery.destination) {
        throw new Error(
          `Notification destination is missing for ${delivery.channel}.`,
        );
      }

      const result = await provider.send({
        destination: delivery.destination,
        title: delivery.notification.title,
        message: delivery.notification.message,
        actionUrl: delivery.notification.actionUrl,
      });

      await completeDelivery(delivery.id, result);
    }

    await refreshNotificationStatus(delivery.notificationId);

    return {
      deliveryId: delivery.id,
      status: "DELIVERED" as const,
    };
  } catch (error) {
    const exhausted = delivery.attemptCount >= delivery.maxAttempts;

    await prisma.enterpriseNotificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "DEAD_LETTER" : "PENDING",
        availableAt: exhausted
          ? delivery.availableAt
          : new Date(Date.now() + 5 * 60 * 1000),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown notification failure.",
      },
    });

    await refreshNotificationStatus(delivery.notificationId);

    return {
      deliveryId: delivery.id,
      status: exhausted ? ("DEAD_LETTER" as const) : ("PENDING" as const),
    };
  }
}

async function completeDelivery(
  deliveryId: string,
  result: {
    provider: string;
    providerMessageId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await prisma.enterpriseNotificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      responseMetadata: toJson(result.metadata ?? {}),
      errorMessage: null,
    },
  });
}

async function refreshNotificationStatus(notificationId: string) {
  const deliveries =
    await prisma.enterpriseNotificationDelivery.findMany({
      where: { notificationId },
      select: { status: true },
    });

  const delivered = deliveries.filter(
    (item) => item.status === "DELIVERED",
  ).length;
  const dead = deliveries.filter(
    (item) =>
      item.status === "DEAD_LETTER" ||
      item.status === "FAILED",
  ).length;

  const status =
    delivered === deliveries.length
      ? "DELIVERED"
      : delivered > 0 && dead > 0
        ? "PARTIALLY_DELIVERED"
        : dead === deliveries.length
          ? "FAILED"
          : "PROCESSING";

  await prisma.enterpriseNotification.update({
    where: { id: notificationId },
    data: {
      status,
      processingAt:
        status === "PROCESSING" ? new Date() : undefined,
      completedAt:
        status === "DELIVERED" || status === "FAILED"
          ? new Date()
          : null,
    },
  });
}

export async function markNotificationRead({
  notificationId,
  userId,
}: {
  notificationId: string;
  userId: string;
}) {
  return prisma.enterpriseNotification.updateMany({
    where: {
      id: notificationId,
      recipientUserId: userId,
    },
    data: { readAt: new Date() },
  });
}

export async function notifyFromDomainEvent({
  tenantId,
  eventId,
  eventType,
  recipientUserId,
  recipientAddress,
  title,
  message,
  actionUrl,
  correlationId,
}: {
  tenantId: string;
  eventId?: string | null;
  eventType: string;
  recipientUserId?: string | null;
  recipientAddress?: string | null;
  title: string;
  message: string;
  actionUrl?: string | null;
  correlationId?: string | null;
}) {
  const notification = await createEnterpriseNotification({
    tenantId,
    eventId,
    eventType,
    recipientUserId,
    recipientAddress,
    title,
    message,
    actionUrl,
    channels: recipientAddress
      ? ["IN_APP", "EMAIL"]
      : ["IN_APP"],
    correlationId,
  });

  await publishDomainEvent({
    tenantId,
    eventType: "Notification.Created",
    aggregateType: "EnterpriseNotification",
    aggregateId: notification.id,
    sourceModule: "notification-center",
    correlationId,
    payload: {
      notificationId: notification.id,
      sourceEventType: eventType,
      recipientUserId,
    },
  });

  return notification;
}


export async function deliverEnterpriseNotificationNow(
  notificationId: string,
) {
  const deliveries =
    await prisma.enterpriseNotificationDelivery.findMany({
      where: {
        notificationId,
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

  const results = [];

  for (const delivery of deliveries) {
    const claimed =
      await prisma.enterpriseNotificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: "PENDING",
        },
        data: {
          status: "PROCESSING",
          processingAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

    if (!claimed.count) continue;
    results.push(await deliverNotification(delivery.id));
  }

  return results;
}

export async function createAndDeliverEnterpriseNotification(
  input: CreateNotificationInput,
) {
  // createEnterpriseNotification now performs immediate
  // best-effort dispatch itself and preserves retry semantics.
  return createEnterpriseNotification(input);
}
