import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getLicensingAdministration() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (
    !session.user.roles.some((role) =>
      ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"].includes(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const [editions, features, tenants] = await Promise.all([
    prisma.commercialEdition.findMany({
      include: { features: { include: { feature: true } } },
      orderBy: { rank: "asc" },
    }),
    prisma.platformFeature.findMany({
      orderBy: [{ groupKey: "asc" }, { name: "asc" }],
    }),
    prisma.tenant.findMany({
      include: {
        subscriptions: {
          where: { status: { in: ["TRIAL", "ACTIVE"] } },
          include: { edition: true },
          orderBy: { startsAt: "desc" },
          take: 1,
        },
        entitlements: { include: { feature: true } },
      },
      orderBy: { name: "asc" },
      take: 250,
    }),
  ]);

  return { editions, features, tenants };
}
