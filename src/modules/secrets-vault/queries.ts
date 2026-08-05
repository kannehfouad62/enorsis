import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSecretsVaultWorkspace() {
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

  const isPlatformOperator = session.user.roles.some((role) =>
    [
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  const secrets = await prisma.vaultSecret.findMany({
    where: isPlatformOperator
      ? {}
      : { tenantId: session.user.tenantId },
    include: {
      versions: {
        select: {
          id: true,
          version: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { version: "desc" },
      },
      accessPolicies: true,
      accessLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ provider: "asc" }, { name: "asc" }],
  });

  return { secrets, isPlatformOperator };
}
