"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { publishDomainEvent } from "@/core/events";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createEventSubscriptionAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
    "TENANT_OWNER",
    "TENANT_ADMIN",
  ]);

  const deliveryType = field(data, "deliveryType") as
    | "INTERNAL_HANDLER"
    | "WEBHOOK"
    | "BACKGROUND_JOB";

  await prisma.platformEventSubscription.create({
    data: {
      key: field(data, "key"),
      name: field(data, "name"),
      eventTypePattern: field(data, "eventTypePattern"),
      deliveryType,
      handlerKey: field(data, "handlerKey") || null,
      webhookUrl: field(data, "webhookUrl") || null,
      backgroundJobKey: field(data, "backgroundJobKey") || null,
      tenantId: user.roles.some((role) =>
        ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"].includes(role),
      )
        ? null
        : user.tenantId,
      maxAttempts: Number(field(data, "maxAttempts") || 3),
      retryDelaySeconds: Number(field(data, "retryDelaySeconds") || 300),
    },
  });

  revalidatePath("/app/settings/events");
}

export async function publishTestEventAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
    "TENANT_OWNER",
    "TENANT_ADMIN",
  ]);

  await publishDomainEvent({
    tenantId: user.tenantId,
    eventType: field(data, "eventType"),
    aggregateType: field(data, "aggregateType") || null,
    aggregateId: field(data, "aggregateId") || null,
    sourceModule: "event-bus-console",
    payload: { message: field(data, "message") || "Test event" },
    actorUserId: user.id,
  });

  revalidatePath("/app/settings/events");
}
