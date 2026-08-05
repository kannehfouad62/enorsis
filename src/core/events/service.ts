import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { DomainEventInput } from "./types";
import { toJson } from "@/lib/prisma-json";

export async function publishDomainEvent(input: DomainEventInput) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.platformEvent.create({
      data: {
        eventId: randomUUID(),
        tenantId: input.tenantId ?? null,
        eventType: input.eventType,
        aggregateType: input.aggregateType ?? null,
        aggregateId: input.aggregateId ?? null,
        sourceModule: input.sourceModule,
        payload: toJson(input.payload),
metadata: toJson(input.metadata ?? {}),
        correlationId: input.correlationId ?? randomUUID(),
        causationId: input.causationId ?? null,
        actorUserId: input.actorUserId ?? null,
      },
    });

    const subscriptions = await tx.platformEventSubscription.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { tenantId: null },
          ...(input.tenantId ? [{ tenantId: input.tenantId }] : []),
        ],
      },
    });

    const matching = subscriptions.filter((item) =>
      matches(item.eventTypePattern, input.eventType),
    );

    if (matching.length) {
      await tx.platformEventDelivery.createMany({
        data: matching.map((subscription) => ({
          eventId: event.id,
          subscriptionId: subscription.id,
        })),
      });
    }

    return event;
  });
}

export async function processPendingEventDeliveries({
  workerId,
  limit = 25,
}: {
  workerId: string;
  limit?: number;
}) {
  const deliveries = await prisma.platformEventDelivery.findMany({
    where: { status: "PENDING", availableAt: { lte: new Date() } },
    include: { event: true, subscription: true },
    orderBy: { availableAt: "asc" },
    take: limit,
  });

  const results: Array<{ deliveryId: string; status: string }> = [];

  for (const item of deliveries) {
    const claimed = await prisma.platformEventDelivery.updateMany({
      where: { id: item.id, status: "PENDING", lockedAt: null },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        lockedBy: workerId,
        attemptCount: { increment: 1 },
      },
    });
    if (!claimed.count) continue;

    try {
      if (item.subscription.deliveryType === "WEBHOOK") {
        if (!item.subscription.webhookUrl) throw new Error("Missing webhook URL.");
        const response = await fetch(item.subscription.webhookUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-enorsis-event-id": item.event.eventId,
            "x-enorsis-event-type": item.event.eventType,
          },
          body: JSON.stringify(item.event),
        });
        if (!response.ok) throw new Error(`Webhook status ${response.status}.`);
      }

      await prisma.platformEventDelivery.update({
        where: { id: item.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          errorMessage: null,
        },
      });
      results.push({ deliveryId: item.id, status: "DELIVERED" });
    } catch (error) {
      const exhausted =
        item.attemptCount >= item.subscription.maxAttempts;
      await prisma.platformEventDelivery.update({
        where: { id: item.id },
        data: {
          status: exhausted ? "DEAD_LETTER" : "PENDING",
          availableAt: exhausted
            ? item.availableAt
            : new Date(Date.now() + item.subscription.retryDelaySeconds * 1000),
          errorMessage:
            error instanceof Error ? error.message : "Unknown delivery error.",
          lockedAt: null,
          lockedBy: null,
        },
      });
      results.push({
        deliveryId: item.id,
        status: exhausted ? "DEAD_LETTER" : "PENDING",
      });
    }
  }

  return results;
}

function matches(pattern: string, eventType: string) {
  if (pattern === "*") return true;
  if (pattern.endsWith(".*")) {
    return eventType.startsWith(pattern.slice(0, -1));
  }
  return pattern === eventType;
}
