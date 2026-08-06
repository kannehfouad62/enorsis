import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPlatformReadinessWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  const runs = await prisma.platformCertificationRun.findMany({
    include: {
      checks: {
        orderBy: [{ category: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { runs };
}
