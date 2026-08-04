import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAgentControlWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [agents, tasks, members] = await Promise.all([
    prisma.aiAgent.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
      },
      orderBy: { name: "asc" },
    }),
    prisma.aiAgentTask.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        agent: true,
        approvals: true,
        attempts: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { session, agents, tasks, members };
}

export async function getAgentTaskDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [task, members] = await Promise.all([
    prisma.aiAgentTask.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        agent: true,
        approvals: { orderBy: { sequence: "asc" } },
        attempts: { orderBy: { attemptNumber: "desc" } },
      },
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!task) redirect("/app/agents/control");
  return { session, task, members };
}
