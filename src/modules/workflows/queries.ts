import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getWorkflowDefinitions() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const definitions = await prisma.workflowDefinition.findMany({
    where: { tenantId: session.user.tenantId },
    include: { steps: { orderBy: { sequence: "asc" } } },
    orderBy: [{ key: "asc" }, { version: "desc" }],
  });

  return { session, definitions };
}

export async function getWorkflowDefinition(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const definition = await prisma.workflowDefinition.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });

  if (!definition) redirect("/app/settings/workflows");
  return { session, definition };
}

export async function getWorkflowInbox() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await prisma.workflowTask.findMany({
    where: {
      status: { in: ["AVAILABLE", "IN_PROGRESS", "ESCALATED"] },
      OR: [
        { assigneeUserId: session.user.id },
        { assigneeRole: { in: session.user.roles } },
      ],
      workflowInstance: { tenantId: session.user.tenantId },
    },
    include: {
      workflowStep: true,
      workflowInstance: {
        include: { workflowDefinition: true },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });

  const instances = await prisma.workflowInstance.findMany({
    where: { tenantId: session.user.tenantId },
    include: { workflowDefinition: true, tasks: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { session, tasks, instances };
}

export async function getWorkflowDelegations() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [delegations, members] = await Promise.all([
    prisma.workflowDelegation.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { startsAt: "desc" },
    }),
    prisma.membership.findMany({
      where: { tenantId: session.user.tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { session, delegations, members };
}
