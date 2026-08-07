import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import type { AutomationDesignerState } from "./designer-types";
import { validateAutomationDesignerState } from "./designer-validation";

export async function saveAutomationRuleVersion(input: {
  tenantId: string;
  ruleId: string;
  designerState: AutomationDesignerState;
  actorUserId: string;
  changeSummary?: string | null;
}) {
  const rule = await prisma.enterpriseAutomationRule.findFirstOrThrow({
    where: {
      id: input.ruleId,
      tenantId: input.tenantId,
    },
  });

  const latest =
    await prisma.enterpriseAutomationRuleVersion.findFirst({
      where: { ruleId: rule.id },
      orderBy: { versionNumber: "desc" },
    });

  const validation = validateAutomationDesignerState(
    input.designerState,
  );

  const version =
    await prisma.enterpriseAutomationRuleVersion.create({
      data: {
        tenantId: input.tenantId,
        ruleId: rule.id,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        status: "DRAFT",
        designerState: toJson(input.designerState),
        validationReport: toJson(validation),
        changeSummary: input.changeSummary ?? null,
        createdByUserId: input.actorUserId,
      },
    });

  await prisma.enterpriseAutomationRule.update({
    where: { id: rule.id },
    data: {
      designerState: toJson(input.designerState),
      lastValidatedAt: new Date(),
    },
  });

  return version;
}

export async function publishAutomationRuleVersion(input: {
  tenantId: string;
  versionId: string;
  actorUserId: string;
}) {
  const version =
    await prisma.enterpriseAutomationRuleVersion.findFirstOrThrow({
      where: {
        id: input.versionId,
        tenantId: input.tenantId,
      },
      include: { rule: true },
    });

  const state =
    version.designerState as unknown as AutomationDesignerState;
  const validation = validateAutomationDesignerState(state);

  if (!validation.valid) {
    throw new Error(
      "Automation version cannot be published until validation errors are resolved.",
    );
  }

  await prisma.enterpriseAutomationRuleVersion.updateMany({
    where: {
      ruleId: version.ruleId,
      status: "PUBLISHED",
    },
    data: {
      status: "SUPERSEDED",
    },
  });

  await prisma.$transaction([
    prisma.enterpriseAutomationRuleVersion.update({
      where: { id: version.id },
      data: {
        status: "PUBLISHED",
        reviewedByUserId: input.actorUserId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        validationReport: toJson(validation),
      },
    }),
    prisma.enterpriseAutomationRule.update({
      where: { id: version.ruleId },
      data: {
        designerState: toJson(version.designerState),
        publishedVersion: version.versionNumber,
        lastValidatedAt: new Date(),
        status: "ACTIVE",
      },
    }),
  ]);

  return version;
}
