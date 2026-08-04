import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getIntegrationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const integrations = await prisma.integrationConnection.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      mappings: true,
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      events: {
        orderBy: { receivedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { session, integrations };
}

export async function getIntegrationDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const integration = await prisma.integrationConnection.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      mappings: {
        orderBy: [{ key: "asc" }, { version: "desc" }],
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      events: {
        orderBy: { receivedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!integration) redirect("/app/settings/integrations");
  return { session, integration };
}

export async function getIntegrationJobsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const jobs = await prisma.integrationJob.findMany({
    where: {
      integration: { tenantId: session.user.tenantId },
    },
    include: { integration: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { session, jobs };
}
