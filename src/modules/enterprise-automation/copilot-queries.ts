import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getAutomationCopilotWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [executions, ruleCount, templateCount, connectorCount] =
    await Promise.all([
      prisma.aiExecution.findMany({
        where: {
          tenantId,
          capability: "PROCUREMENT_COPILOT",
          resourceType: "EnterpriseAutomationCopilot",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.enterpriseAutomationRule.count({
        where: { tenantId },
      }),
      prisma.enterpriseAutomationTemplate.count({
        where: {
          active: true,
          OR: [{ tenantId: null }, { tenantId }],
        },
      }),
      prisma.enterpriseAutomationConnector.count({
        where: {
          tenantId,
          status: "ACTIVE",
        },
      }),
    ]);

  return {
    executions,
    ruleCount,
    templateCount,
    connectorCount,
  };
}
