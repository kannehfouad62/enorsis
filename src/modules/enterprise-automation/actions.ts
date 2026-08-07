"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { runEnterpriseAutomationRule } from "@/core/enterprise-automation/executor";

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

export async function createEnterpriseAutomationRuleAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const rule = await prisma.enterpriseAutomationRule.create({
    data: {
      tenantId: user.tenantId,
      ruleKey: field(data, "ruleKey"),
      name: field(data, "name"),
      description: field(data, "description") || null,
      status: "DRAFT",
      priority: Number(field(data, "priority") || "100"),
      stopOnFailure: field(data, "stopOnFailure") === "on",
      createdByUserId: user.id,
    },
  });

  await prisma.enterpriseAutomationTrigger.create({
    data: {
      tenantId: user.tenantId,
      ruleId: rule.id,
      triggerType: field(data, "triggerType") as
        | "DOMAIN_EVENT"
        | "SCHEDULE"
        | "RECORD_CONDITION"
        | "MANUAL",
      eventType: field(data, "eventType") || null,
      scheduleExpression:
        field(data, "scheduleExpression") || null,
      conditionExpression: toJson({}),
    },
  });

  revalidatePath("/app/automation");
}

export async function addEnterpriseAutomationActionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const ruleId = field(data, "ruleId");

  const rule = await prisma.enterpriseAutomationRule.findFirstOrThrow({
    where: { id: ruleId, tenantId: user.tenantId },
  });

  const count = await prisma.enterpriseAutomationAction.count({
    where: { ruleId: rule.id },
  });

  const actionType = field(data, "actionType") as
    | "START_WORKFLOW"
    | "CREATE_NOTIFICATION"
    | "CREATE_TASK"
    | "PUBLISH_EVENT"
    | "LOG_ACTIVITY";

  await prisma.enterpriseAutomationAction.create({
    data: {
      tenantId: user.tenantId,
      ruleId: rule.id,
      sequence: count + 1,
      actionType,
      actionKey: `${actionType.toLowerCase()}.${count + 1}`,
      configuration: toJson({
        workflowDefinitionId:
          field(data, "workflowDefinitionId") || undefined,
        eventType:
          field(data, "outboundEventType") || undefined,
        notificationTitle:
          field(data, "notificationTitle") || undefined,
        taskTitle: field(data, "taskTitle") || undefined,
        activityTitle:
          field(data, "activityTitle") || undefined,
      }),
    },
  });

  revalidatePath("/app/automation");
}

export async function activateEnterpriseAutomationRuleAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await prisma.enterpriseAutomationRule.updateMany({
    where: {
      id: field(data, "ruleId"),
      tenantId: user.tenantId,
    },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/app/automation");
}

export async function runEnterpriseAutomationRuleNowAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await runEnterpriseAutomationRule({
    ruleId: field(data, "ruleId"),
    context: {
      tenantId: user.tenantId,
      triggerType: "MANUAL",
      triggerReference: `manual:${user.id}:${Date.now()}`,
      actorUserId: user.id,
      payload: {
        initiatedFrom: "/app/automation",
      },
    },
  });

  revalidatePath("/app/automation");
}
