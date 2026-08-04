import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMyWorkflowNotifications() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.workflowNotification.findMany({
    where: {
      tenantId: session.user.tenantId,
      recipientUserId: session.user.id,
      channel: "IN_APP",
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { session, notifications };
}

export async function getWorkflowNotificationOperations() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.workflowNotification.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return {
    notifications,
    metrics: {
      pending: notifications.filter((item) =>
        ["PENDING", "PROCESSING"].includes(item.status),
      ).length,
      delivered: notifications.filter(
        (item) => item.status === "DELIVERED",
      ).length,
      failed: notifications.filter((item) =>
        ["FAILED", "CANCELLED"].includes(item.status),
      ).length,
      email: notifications.filter((item) => item.channel === "EMAIL").length,
      inApp: notifications.filter((item) => item.channel === "IN_APP").length,
    },
  };
}
