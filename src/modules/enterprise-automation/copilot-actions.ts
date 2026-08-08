"use server";

import { revalidatePath } from "next/cache";
import { executeGovernedAi } from "@/core/ai/gateway";
import { requireAnyRole } from "@/core/auth/authorization";
import { buildAutomationCopilotPrompt } from "@/core/enterprise-automation/automation-copilot";
import { prisma } from "@/lib/prisma";

const permittedRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateAutomationCopilotDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...permittedRoles]);
  const intent = field(data, "intent");

  if (intent.length < 20 || intent.length > 8000) {
    throw new Error(
      "Automation intent must contain between 20 and 8,000 characters.",
    );
  }

  const [rules, templates, connectors] = await Promise.all([
    prisma.enterpriseAutomationRule.findMany({
      where: { tenantId: user.tenantId },
      select: {
        name: true,
        status: true,
        description: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.enterpriseAutomationTemplate.findMany({
      where: {
        active: true,
        OR: [{ tenantId: null }, { tenantId: user.tenantId }],
      },
      select: {
        name: true,
        category: true,
        description: true,
      },
      orderBy: [{ systemTemplate: "desc" }, { name: "asc" }],
      take: 25,
    }),
    prisma.enterpriseAutomationConnector.findMany({
      where: {
        tenantId: user.tenantId,
        status: "ACTIVE",
      },
      select: {
        name: true,
        connectorKey: true,
        type: true,
        status: true,
        policyTag: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);

  await executeGovernedAi({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email ?? "unknown@enorsis.local",
    capability: "PROCUREMENT_COPILOT",
    input: buildAutomationCopilotPrompt({
      intent,
      context: {
        rules,
        templates,
        connectors,
      },
    }),
    resourceType: "EnterpriseAutomationCopilot",
  });

  revalidatePath("/app/automation/copilot");
}
