import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getRtoEscalationAssuranceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.enterpriseNotification.findMany({
    where: {
      tenantId: session.user.tenantId,
      eventType: { startsWith: "RTO_SLA_ESCALATION:" },
    },
    include: {
      deliveries: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const items = notifications.map((notification) => {
    const data = record(notification.data);
    const parts = notification.eventType.split(":");
    const rawAge = data.ageHours;
    const ageHours =
      typeof rawAge === "number" && Number.isFinite(rawAge)
        ? rawAge
        : null;
    const slaState =
      typeof data.slaState === "string"
        ? data.slaState
        : parts[3] ?? "BREACHED";
    const journeyNumber =
      typeof data.journeyNumber === "string"
        ? data.journeyNumber
        : null;

    const delivered = notification.deliveries.filter(
      (delivery) => delivery.status === "DELIVERED",
    ).length;
    const failed = notification.deliveries.filter(
      (delivery) => delivery.status === "FAILED",
    ).length;
    const pending =
      notification.deliveries.length - delivered - failed;

    return {
      id: notification.id,
      type: parts[1] === "APPROVAL" ? "APPROVAL" : "EXCEPTION",
      slaState,
      journeyNumber,
      title: notification.title,
      message: notification.message,
      ageHours,
      recipientUserId: notification.recipientUserId,
      recipientAddress: notification.recipientAddress,
      notificationStatus: notification.status,
      priority: notification.priority,
      createdAt: notification.createdAt,
      acknowledgedAt: notification.readAt,
      errorMessage: notification.errorMessage,
      delivered,
      failed,
      pending,
      deliveries: notification.deliveries,
    };
  });

  const ages = items
    .map((item) => item.ageHours)
    .filter((value): value is number => value !== null);

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      total: items.length,
      critical: items.filter(
        (item) => item.slaState === "CRITICAL_BREACH",
      ).length,
      delivered: items.filter((item) => item.delivered > 0).length,
      deliveryFailures: items.filter((item) => item.failed > 0).length,
      acknowledged: items.filter(
        (item) => Boolean(item.acknowledgedAt),
      ).length,
      unacknowledged: items.filter(
        (item) => !item.acknowledgedAt,
      ).length,
      averageAgeHours:
        ages.length > 0
          ? ages.reduce((sum, value) => sum + value, 0) / ages.length
          : 0,
    },
  };
}
