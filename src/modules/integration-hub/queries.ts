import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getIntegrationHubWorkspace() {
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

  const [definitions, connections, syncRuns] = await Promise.all([
    prisma.enterpriseConnectorDefinition.findMany({
      where: { active: true },
      orderBy: [{ provider: "asc" }, { name: "asc" }],
    }),
    prisma.enterpriseConnectorConnection.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        connectorDefinition: true,
        credentials: true,
        mappings: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.enterpriseIntegrationSyncRun.findMany({
      where: {
        connection: { tenantId: session.user.tenantId },
      },
      include: {
        connection: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { definitions, connections, syncRuns };
}
