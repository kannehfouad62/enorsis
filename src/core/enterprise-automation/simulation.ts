import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import type { AutomationDesignerState } from "./designer-types";
import { simulateDesignerState } from "./designer-evaluator";
import { validateAutomationDesignerState } from "./designer-validation";

export async function simulateAutomationRule(input: {
  tenantId: string;
  ruleId: string;
  versionId?: string | null;
  payload: Record<string, unknown>;
  actorUserId: string;
}) {
  const rule = await prisma.enterpriseAutomationRule.findFirstOrThrow({
    where: {
      id: input.ruleId,
      tenantId: input.tenantId,
    },
  });

  const version = input.versionId
    ? await prisma.enterpriseAutomationRuleVersion.findFirstOrThrow({
        where: {
          id: input.versionId,
          tenantId: input.tenantId,
          ruleId: rule.id,
        },
      })
    : await prisma.enterpriseAutomationRuleVersion.findFirst({
        where: { ruleId: rule.id },
        orderBy: { versionNumber: "desc" },
      });

  const state = (
    version?.designerState ?? rule.designerState
  ) as unknown as AutomationDesignerState | null;

  if (!state) {
    throw new Error("Automation rule has no designer state to simulate.");
  }

  const validation = validateAutomationDesignerState(state);
  const simulation = simulateDesignerState(
    state,
    input.payload,
  );

  const status = !validation.valid
    ? "FAILED"
    : validation.issues.length > 0
      ? "WARNING"
      : "PASSED";

  return prisma.enterpriseAutomationSimulation.create({
    data: {
      tenantId: input.tenantId,
      ruleId: rule.id,
      versionId: version?.id ?? null,
      status,
      input: toJson(input.payload),
      matched: simulation.matched,
      conditionTrace: toJson(simulation.conditionTrace),
      actionPreview: toJson(simulation.actionPreview),
      warnings: toJson(validation.issues),
      simulatedByUserId: input.actorUserId,
    },
  });
}
