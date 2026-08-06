import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPolicyFrameworkWorkspace() {
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

  const [policies, flags] = await Promise.all([
    prisma.enterprisePolicyDefinition.findMany({
      include: {
        tenantOverrides: {
          where: { tenantId: session.user.tenantId },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.enterpriseFeatureFlag.findMany({
      include: {
        tenantOverrides: {
          where: { tenantId: session.user.tenantId },
        },
      },
      orderBy: [{ moduleKey: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    policies,
    flags,
    isPlatformOperator,
  };
}
