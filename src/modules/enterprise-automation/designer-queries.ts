import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureEnterpriseAutomationTemplates } from "@/core/enterprise-automation/templates";

export async function getAutomationDesignerWorkspace(
  ruleId?: string | null,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  await ensureEnterpriseAutomationTemplates();

  const [rules, templates, simulations] = await Promise.all([
    prisma.enterpriseAutomationRule.findMany({
      where: { tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 20,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.enterpriseAutomationTemplate.findMany({
      where: {
        active: true,
        OR: [
          { tenantId: null },
          { tenantId },
        ],
      },
      orderBy: [
        { systemTemplate: "desc" },
        { category: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.enterpriseAutomationSimulation.findMany({
      where: {
        tenantId,
        ...(ruleId ? { ruleId } : {}),
      },
      include: {
        rule: true,
        version: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const selected =
    rules.find((rule) => rule.id === ruleId) ??
    rules[0] ??
    null;

  return {
    rules,
    selected,
    templates,
    simulations,
  };
}
