import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getEnterpriseAnalyticsFoundationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [definitions, latestSnapshots, runs] = await Promise.all([
    prisma.enterpriseAnalyticsMetricDefinition.findMany({
      where: { tenantId, active: true },
      orderBy: [{ domain: "asc" }, { name: "asc" }],
    }),
    prisma.enterpriseAnalyticsMetricSnapshot.findMany({
      where: { tenantId },
      include: { metricDefinition: true },
      orderBy: { calculatedAt: "desc" },
      distinct: ["metricDefinitionId", "dimensionKey"],
      take: 100,
    }),
    prisma.enterpriseAnalyticsAggregationRun.findMany({
      where: { tenantId },
      include: {
        failures: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return { definitions, latestSnapshots, runs };
}
