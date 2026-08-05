import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPlatformEventsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowed = session.user.roles.some((role) =>
    [
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
      "TENANT_OWNER",
      "TENANT_ADMIN",
    ].includes(role),
  );
  if (!allowed) redirect("/app/unauthorized");

  const platform = session.user.roles.some((role) =>
    ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_AUDITOR"].includes(role),
  );

  const [subscriptions, events] = await Promise.all([
    prisma.platformEventSubscription.findMany({
      where: platform
        ? {}
        : { OR: [{ tenantId: null }, { tenantId: session.user.tenantId }] },
      orderBy: { name: "asc" },
    }),
    prisma.platformEvent.findMany({
      where: platform ? {} : { tenantId: session.user.tenantId },
      include: { deliveries: true },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
  ]);

  return { subscriptions, events };
}
