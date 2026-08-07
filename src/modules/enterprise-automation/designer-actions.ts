"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import type { AutomationDesignerState } from "@/core/enterprise-automation/designer-types";
import {
  publishAutomationRuleVersion,
  saveAutomationRuleVersion,
} from "@/core/enterprise-automation/versioning";
import { simulateAutomationRule } from "@/core/enterprise-automation/simulation";
import { toJson } from "@/lib/prisma-json";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
] as const;

export async function saveAutomationDesignerVersionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const designerState = JSON.parse(
    field(data, "designerState"),
  ) as AutomationDesignerState;

  await saveAutomationRuleVersion({
    tenantId: user.tenantId,
    ruleId: field(data, "ruleId"),
    designerState,
    actorUserId: user.id,
    changeSummary: field(data, "changeSummary") || null,
  });

  revalidatePath("/app/automation/designer");
  revalidatePath("/app/automation");
}

export async function publishAutomationRuleVersionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await publishAutomationRuleVersion({
    tenantId: user.tenantId,
    versionId: field(data, "versionId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/automation/designer");
  revalidatePath("/app/automation");
}

export async function simulateAutomationRuleAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const payloadText = field(data, "payload") || "{}";

  await simulateAutomationRule({
    tenantId: user.tenantId,
    ruleId: field(data, "ruleId"),
    versionId: field(data, "versionId") || null,
    payload: JSON.parse(payloadText) as Record<string, unknown>,
    actorUserId: user.id,
  });

  revalidatePath("/app/automation/designer");
}

export async function applyAutomationTemplateAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const template =
    await prisma.enterpriseAutomationTemplate.findFirstOrThrow({
      where: {
        id: field(data, "templateId"),
        active: true,
        OR: [
          { tenantId: null },
          { tenantId: user.tenantId },
        ],
      },
    });

  await prisma.enterpriseAutomationRule.updateMany({
    where: {
      id: field(data, "ruleId"),
      tenantId: user.tenantId,
    },
    data: {
      designerState: toJson(template.designerState),
      lastValidatedAt: null,
    },
  });

  revalidatePath("/app/automation/designer");
}
