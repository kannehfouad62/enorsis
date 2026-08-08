import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function getDurableAutomationRuntimeWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [rules, executions] = await Promise.all([
    prisma.enterpriseAutomationRule.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        designerState: {
          not: Prisma.JsonNull,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.enterpriseAutomationRuntimeExecution.findMany({
      where: { tenantId },
      include: {
        rule: true,
        nodes: {
          orderBy: { createdAt: "asc" },
        },
        signals: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        actions: {
          include: {
            callbacks: {
              orderBy: {
                receivedAt: "desc",
              },
              take: 5,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { rules, executions };
}
