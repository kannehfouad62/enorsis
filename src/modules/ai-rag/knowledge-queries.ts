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

export async function getEnterpriseKnowledgeWorkspace() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [sources, executions, chunkCount] = await Promise.all([
    prisma.enterpriseKnowledgeSource.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.aiExecution.findMany({
      where: {
        tenantId,
        resourceType: "EnterpriseSemanticRag",
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.enterpriseKnowledgeChunk.count({
      where: { tenantId },
    }),
  ]);

  return {
    session,
    sources,
    executions,
    chunkCount,
  };
}
