import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { evaluateAutomationCondition } from "./conditions";
import type {
  AutomationActionConfiguration,
  AutomationExecutionContext,
} from "./types";

async function executeAction(input: {
  actionType: string;
  configuration: AutomationActionConfiguration;
  context: AutomationExecutionContext;
  ruleId: string;
}) {
  if (input.actionType === "PUBLISH_EVENT") {
    if (!input.configuration.eventType) {
      throw new Error("PUBLISH_EVENT action requires eventType.");
    }

    await publishDomainEvent({
      tenantId: input.context.tenantId,
      eventType: input.configuration.eventType,
      aggregateType: "EnterpriseAutomationRule",
      aggregateId: input.ruleId,
      sourceModule: "enterprise-automation",
      actorUserId: input.context.actorUserId ?? undefined,
      payload: input.context.payload ?? {},
    });

    return { published: input.configuration.eventType };
  }

  if (input.actionType === "LOG_ACTIVITY") {
    await recordEnterpriseActivity({
      tenantId: input.context.tenantId,
      activityType: "EnterpriseAutomation.ActionExecuted",
      sourceModule: "enterprise-automation",
      title:
        input.configuration.activityTitle ??
        "Enterprise automation action executed",
      description:
        input.configuration.activityDescription ??
        input.configuration.activityTitle ??
        "Automation rule executed.",
      severity: "SUCCESS",
      actorUserId: input.context.actorUserId ?? undefined,
      subjectType: "EnterpriseAutomationRule",
      subjectId: input.ruleId,
      subjectLabel: input.configuration.activityTitle ?? "Automation",
      actionUrl: "/app/automation",
    });

    return { activityLogged: true };
  }

  if (input.actionType === "START_WORKFLOW") {
    if (!input.configuration.workflowDefinitionId) {
      throw new Error(
        "START_WORKFLOW action requires workflowDefinitionId.",
      );
    }

    await publishDomainEvent({
      tenantId: input.context.tenantId,
      eventType: "EnterpriseAutomation.WorkflowStartRequested",
      aggregateType: "WorkflowDefinition",
      aggregateId: input.configuration.workflowDefinitionId,
      sourceModule: "enterprise-automation",
      actorUserId: input.context.actorUserId ?? undefined,
      payload: {
        workflowDefinitionId:
          input.configuration.workflowDefinitionId,
        automationRuleId: input.ruleId,
        triggerReference: input.context.triggerReference ?? null,
        input: input.context.payload ?? {},
      },
    });

    return {
      workflowStartRequested:
        input.configuration.workflowDefinitionId,
    };
  }

  if (input.actionType === "CREATE_NOTIFICATION") {
    await publishDomainEvent({
      tenantId: input.context.tenantId,
      eventType: "EnterpriseAutomation.NotificationRequested",
      aggregateType: "EnterpriseAutomationRule",
      aggregateId: input.ruleId,
      sourceModule: "enterprise-automation",
      actorUserId: input.context.actorUserId ?? undefined,
      payload: {
        title:
          input.configuration.notificationTitle ??
          "Automation notification",
        body:
          input.configuration.notificationBody ??
          "An enterprise automation rule was triggered.",
        sourcePayload: input.context.payload ?? {},
      },
    });

    return { notificationRequested: true };
  }

  if (input.actionType === "CREATE_TASK") {
    await publishDomainEvent({
      tenantId: input.context.tenantId,
      eventType: "EnterpriseAutomation.TaskRequested",
      aggregateType: "EnterpriseAutomationRule",
      aggregateId: input.ruleId,
      sourceModule: "enterprise-automation",
      actorUserId: input.context.actorUserId ?? undefined,
      payload: {
        title:
          input.configuration.taskTitle ??
          "Automation follow-up task",
        sourcePayload: input.context.payload ?? {},
      },
    });

    return { taskRequested: true };
  }

  throw new Error(`Unsupported automation action: ${input.actionType}`);
}

export async function runEnterpriseAutomationRule(input: {
  ruleId: string;
  context: AutomationExecutionContext;
}) {
  const rule = await prisma.enterpriseAutomationRule.findFirstOrThrow({
    where: {
      id: input.ruleId,
      tenantId: input.context.tenantId,
      status: "ACTIVE",
    },
    include: {
      triggers: {
        where: { enabled: true },
      },
      actions: {
        where: { enabled: true },
        orderBy: { sequence: "asc" },
      },
    },
  });

  const relevantTriggers = rule.triggers.filter(
    (trigger) => trigger.triggerType === input.context.triggerType,
  );

  const conditionMatched =
    relevantTriggers.length === 0 ||
    relevantTriggers.some((trigger) =>
      evaluateAutomationCondition(
        input.context.payload ?? {},
        trigger.conditionExpression,
      ),
    );

  const count = await prisma.enterpriseAutomationRun.count({
    where: { tenantId: input.context.tenantId },
  });

  const run = await prisma.enterpriseAutomationRun.create({
    data: {
      tenantId: input.context.tenantId,
      ruleId: rule.id,
      runNumber: `AUT-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(7, "0")}`,
      status: conditionMatched ? "RUNNING" : "SKIPPED",
      triggerType: input.context.triggerType,
      triggerReference: input.context.triggerReference ?? null,
      startedAt: new Date(),
      input: toJson(input.context.payload ?? {}),
      initiatedByUserId: input.context.actorUserId ?? null,
    },
  });

  if (!conditionMatched) {
    return prisma.enterpriseAutomationRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        output: toJson({ reason: "Trigger condition did not match." }),
      },
    });
  }

  let warnings = 0;

  try {
    for (const action of rule.actions) {
      const actionRun =
        await prisma.enterpriseAutomationActionRun.create({
          data: {
            tenantId: input.context.tenantId,
            automationRunId: run.id,
            actionId: action.id,
            sequence: action.sequence,
            status: "RUNNING",
            startedAt: new Date(),
          },
        });

      try {
        const output = await executeAction({
          actionType: action.actionType,
          configuration:
            action.configuration as AutomationActionConfiguration,
          context: input.context,
          ruleId: rule.id,
        });

        await prisma.enterpriseAutomationActionRun.update({
          where: { id: actionRun.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            output: toJson(output),
          },
        });
      } catch (error) {
        warnings += 1;

        await prisma.enterpriseAutomationActionRun.update({
          where: { id: actionRun.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorMessage:
              error instanceof Error
                ? error.message
                : "Unknown automation action failure.",
          },
        });

        if (rule.stopOnFailure) throw error;
      }
    }

    return prisma.enterpriseAutomationRun.update({
      where: { id: run.id },
      data: {
        status:
          warnings > 0
            ? "COMPLETED_WITH_WARNINGS"
            : "COMPLETED",
        completedAt: new Date(),
        output: toJson({
          actionCount: rule.actions.length,
          warningCount: warnings,
        }),
      },
      include: {
        actionRuns: {
          orderBy: { sequence: "asc" },
        },
      },
    });
  } catch (error) {
    await prisma.enterpriseAutomationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown automation rule failure.",
      },
    });

    throw error;
  }
}
