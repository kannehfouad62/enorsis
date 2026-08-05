import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPlatformJobsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
      "TENANT_OWNER",
      "TENANT_ADMIN",
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

  const [definitions, executions] = await Promise.all([
    prisma.platformJobDefinition.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.platformJobExecution.findMany({
      where: isPlatformOperator
        ? {}
        : { tenantId: session.user.tenantId },
      include: { jobDefinition: true },
      orderBy: { queuedAt: "desc" },
      take: 200,
    }),
  ]);

  return {
    definitions,
    executions,
    isPlatformOperator,
    tenantId: session.user.tenantId,
  };
}
