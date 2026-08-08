import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  procurementAssistants,
} from "@/core/ai/assistants/assistant-config";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "FINANCE",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getSpecializedAssistantWorkspace() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [executions, knowledgeSources, knowledgeChunks] =
    await Promise.all([
      prisma.aiExecution.findMany({
        where: {
          tenantId,
          resourceType: {
            startsWith: "ProcurementAssistant:",
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.enterpriseKnowledgeSource.count({
        where: {
          tenantId,
          status: "ACTIVE",
        },
      }),
      prisma.enterpriseKnowledgeChunk.count({
        where: { tenantId },
      }),
    ]);

  const availableAssistants = Object.values(
    procurementAssistants,
  ).filter((assistant) =>
    assistant.roles.some((role) =>
      session.user.roles.includes(role),
    ),
  );

  return {
    session,
    executions,
    availableAssistants,
    knowledgeSources,
    knowledgeChunks,
  };
}
