import { prisma } from "@/lib/prisma";
import { runEnterpriseAutomationRule } from "./executor";

function isDue(expression: string, now: Date) {
  if (expression === "HOURLY") return true;
  if (expression === "DAILY") return now.getUTCHours() === 0;
  if (expression.startsWith("HOUR_")) {
    return Number(expression.slice(5)) === now.getUTCHours();
  }
  return false;
}

export async function runScheduledEnterpriseAutomations() {
  const now = new Date();

  const triggers = await prisma.enterpriseAutomationTrigger.findMany({
    where: {
      enabled: true,
      triggerType: "SCHEDULE",
      rule: { status: "ACTIVE" },
    },
    include: { rule: true },
  });

  const due = triggers.filter(
    (trigger) =>
      trigger.scheduleExpression &&
      isDue(trigger.scheduleExpression, now),
  );

  const results = [];

  for (const trigger of due) {
    try {
      results.push(
        await runEnterpriseAutomationRule({
          ruleId: trigger.ruleId,
          context: {
            tenantId: trigger.tenantId,
            triggerType: "SCHEDULE",
            triggerReference: `${trigger.id}:${now
              .toISOString()
              .slice(0, 13)}`,
            payload: {
              scheduledAt: now.toISOString(),
              expression: trigger.scheduleExpression,
            },
          },
        }),
      );
    } catch (error) {
      results.push({
        triggerId: trigger.id,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown scheduled automation failure.",
      });
    }
  }

  return {
    evaluated: triggers.length,
    due: due.length,
    results,
  };
}
