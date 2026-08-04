import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getWorkflowAutomationDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [definitions, instances, delegations, escalations] =
    await Promise.all([
      prisma.workflowDefinition.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
        },
        include: {
          steps: true,
        },
        orderBy: [{ resourceType: "asc" }, { name: "asc" }],
      }),
      prisma.workflowInstance.findMany({
        where: { tenantId },
        include: {
          workflowDefinition: true,
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.workflowDelegation.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: { endsAt: "asc" },
      }),
      prisma.workflowEscalation.findMany({
        where: {
          workflowInstance: { tenantId },
          status: { in: ["PENDING", "SENT"] },
        },
        include: {
          workflowInstance: {
            include: { workflowDefinition: true },
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: 50,
      }),
    ]);

  return {
    definitions,
    instances,
    delegations,
    escalations,
    metrics: {
      activeDefinitions: definitions.length,
      runningInstances: instances.filter((instance) =>
        ["PENDING", "RUNNING", "WAITING"].includes(instance.status),
      ).length,
      completedInstances: instances.filter(
        (instance) => instance.status === "COMPLETED",
      ).length,
      rejectedInstances: instances.filter(
        (instance) => instance.status === "REJECTED",
      ).length,
      activeDelegations: delegations.length,
      pendingEscalations: escalations.filter(
        (escalation) => escalation.status === "PENDING",
      ).length,
    },
  };
}
