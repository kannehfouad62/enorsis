import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getIntegrationOperationsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [connections, jobs, events] = await Promise.all([
    prisma.integrationConnection.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.integrationJob.findMany({
      where: {
        integration: { tenantId },
        createdAt: { gte: since },
      },
      include: { integration: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.integrationEvent.findMany({
      where: {
        integration: { tenantId },
        receivedAt: { gte: since },
      },
      include: { integration: true },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
  ]);

  const succeeded = jobs.filter((job) => job.status === "SUCCEEDED").length;
  const failed = jobs.filter((job) =>
    ["FAILED", "DEAD_LETTER"].includes(job.status),
  ).length;
  const completed = succeeded + failed;

  return {
    connections,
    jobs,
    events,
    metrics: {
      activeConnections: connections.filter(
        (connection) => connection.status === "ACTIVE",
      ).length,
      errorConnections: connections.filter(
        (connection) => connection.status === "ERROR",
      ).length,
      queuedJobs: jobs.filter((job) =>
        ["QUEUED", "RUNNING"].includes(job.status),
      ).length,
      deadLetterJobs: jobs.filter(
        (job) => job.status === "DEAD_LETTER",
      ).length,
      successRate:
        completed === 0 ? 100 : Math.round((succeeded / completed) * 100),
      rejectedEvents: events.filter(
        (event) => event.status === "REJECTED",
      ).length,
    },
  };
}
