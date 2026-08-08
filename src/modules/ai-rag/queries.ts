import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "FINANCE",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getUnifiedProcurementAiWorkspace() {
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

  const [
    executions,
    contracts,
    suppliers,
    policies,
    procedures,
  ] = await Promise.all([
    prisma.aiExecution.findMany({
      where: {
        tenantId,
        resourceType: "EnterpriseRagCopilot",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.contract.count({ where: { tenantId } }),
    prisma.supplier.count({ where: { tenantId } }),
    prisma.enterprisePolicyDefinition.count(),
    prisma.workflowDefinition.count({ where: { tenantId } }),
  ]);

  return {
    session,
    executions,
    coverage: {
      contracts,
      suppliers,
      policies,
      procedures,
    },
  };
}
