import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getNotificationAdministration() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  const [templates, notifications] = await Promise.all([
    prisma.enterpriseNotificationTemplate.findMany({
      where: {
        OR: [
          { tenantId: session.user.tenantId },
          { tenantId: null },
        ],
      },
      orderBy: [{ key: "asc" }, { version: "desc" }],
    }),
    prisma.enterpriseNotification.findMany({
      where: { tenantId: session.user.tenantId },
      include: { deliveries: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { templates, notifications };
}

export async function getMyNotifications() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return prisma.enterpriseNotification.findMany({
    where: {
      tenantId: session.user.tenantId,
      recipientUserId: session.user.id,
      archivedAt: null,
    },
    include: { deliveries: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
