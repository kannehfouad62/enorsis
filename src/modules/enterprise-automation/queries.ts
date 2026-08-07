import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getEnterpriseAutomationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [rules, runs] = await Promise.all([
    prisma.enterpriseAutomationRule.findMany({
      where: { tenantId },
      include: {
        triggers: true,
        actions: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: [
        { status: "asc" },
        { priority: "asc" },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
    prisma.enterpriseAutomationRun.findMany({
      where: { tenantId },
      include: {
        rule: true,
        actionRuns: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { rules, runs };
}
