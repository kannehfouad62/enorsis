import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mineWorkflowProcesses } from "@/core/process-mining/workflow-miner";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getProcessMiningWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const instances = await prisma.workflowInstance.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      status: true,
      resourceType: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      workflowDefinition: {
        select: {
          id: true,
          key: true,
          name: true,
          version: true,
        },
      },
      tasks: {
        select: {
          id: true,
          status: true,
          availableAt: true,
          dueAt: true,
          startedAt: true,
          decidedAt: true,
          createdAt: true,
          updatedAt: true,
          workflowStep: {
            select: {
              id: true,
              key: true,
              name: true,
              sequence: true,
              type: true,
            },
          },
        },
        orderBy: [
          { workflowStep: { sequence: "asc" } },
          { createdAt: "asc" },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return {
    session,
    mining: mineWorkflowProcesses(instances),
    analyzedAt: new Date(),
  };
}
