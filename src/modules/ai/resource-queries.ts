import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getResourceAiExecutions(
  resourceType: string,
  resourceId: string,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const executions = await prisma.aiExecution.findMany({
    where: {
      tenantId: session.user.tenantId,
      resourceType,
      resourceId,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { session, executions };
}

export async function getExecutiveAiWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [suppliers, sourcingEvents, contracts, executions] =
    await Promise.all([
      prisma.supplier.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
        },
        orderBy: { legalName: "asc" },
      }),
      prisma.sourcingEvent.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          id: true,
          eventNumber: true,
          title: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contract.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          id: true,
          contractNumber: true,
          title: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aiExecution.findMany({
        where: {
          tenantId: session.user.tenantId,
          capability: "EXECUTIVE_BRIEF",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return {
    session,
    suppliers,
    sourcingEvents,
    contracts,
    executions,
  };
}
