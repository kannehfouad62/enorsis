import { prisma } from "@/lib/prisma";
import { runEnterpriseAutomationRule } from "./executor";

export async function processEnterpriseAutomationEvent(input: {
  tenantId: string;
  eventType: string;
  eventId?: string | null;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const rules = await prisma.enterpriseAutomationRule.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      triggers: {
        some: {
          enabled: true,
          triggerType: "DOMAIN_EVENT",
          eventType: input.eventType,
        },
      },
    },
    orderBy: { priority: "asc" },
  });

  const results = [];

  for (const rule of rules) {
    try {
      results.push(
        await runEnterpriseAutomationRule({
          ruleId: rule.id,
          context: {
            tenantId: input.tenantId,
            triggerType: "DOMAIN_EVENT",
            triggerReference: input.eventId ?? input.eventType,
            actorUserId: input.actorUserId ?? null,
            payload: input.payload ?? {},
          },
        }),
      );
    } catch (error) {
      results.push({
        ruleId: rule.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown automation event failure.",
      });
    }
  }

  return {
    eventType: input.eventType,
    matchedRules: rules.length,
    results,
  };
}
