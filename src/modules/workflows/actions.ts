"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireAuthenticatedIdentity } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { processWorkflowDecision, startWorkflow } from "./engine";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const json = (value: string, label: string) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
};

export async function createWorkflowDefinitionAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);

  await prisma.workflowDefinition.create({
    data: {
      tenantId: user.tenantId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      resourceType: field(formData, "resourceType"),
      triggerEvent: field(formData, "triggerEvent"),
      conditionExpression: json(
        field(formData, "conditionExpression"),
        "Definition condition",
      ),
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/workflows");
  return;
}

export async function addWorkflowStepAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const workflowDefinitionId = field(formData, "workflowDefinitionId");

  await prisma.workflowDefinition.findFirstOrThrow({
    where: { id: workflowDefinitionId, tenantId: user.tenantId },
  });

  await prisma.workflowStep.create({
    data: {
      workflowDefinitionId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      type: field(formData, "type") as
        | "APPROVAL"
        | "REVIEW"
        | "NOTIFICATION"
        | "SYSTEM_TASK"
        | "AI_REVIEW",
      sequence: Number(field(formData, "sequence")),
      routingMode: field(formData, "routingMode") as
        | "SEQUENTIAL"
        | "PARALLEL"
        | "ANY_ONE",
      conditionExpression: json(
        field(formData, "conditionExpression"),
        "Step condition",
      ),
      assigneeRoles: field(formData, "assigneeRoles")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      assigneeUserIds: field(formData, "assigneeUserIds")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      dueInHours: field(formData, "dueInHours")
        ? Number(field(formData, "dueInHours"))
        : null,
      escalationAfterHours: field(formData, "escalationAfterHours")
        ? Number(field(formData, "escalationAfterHours"))
        : null,
      escalationRoles: field(formData, "escalationRoles")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      allowDelegation: formData.get("allowDelegation") === "on",
      requiresComment: formData.get("requiresComment") === "on",
    },
  });

  revalidatePath(`/app/settings/workflows/${workflowDefinitionId}`);
}

export async function activateWorkflowDefinitionAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const workflowDefinitionId = field(formData, "workflowDefinitionId");

  const definition = await prisma.workflowDefinition.findFirstOrThrow({
    where: { id: workflowDefinitionId, tenantId: user.tenantId },
    include: { steps: true },
  });

  if (definition.steps.length === 0) {
    throw new Error("A workflow must contain at least one step.");
  }

  await prisma.workflowDefinition.update({
    where: { id: definition.id },
    data: {
      status: "ACTIVE",
      activatedByUserId: user.id,
      activatedAt: new Date(),
    },
  });

  revalidatePath(`/app/settings/workflows/${definition.id}`);
  revalidatePath("/app/settings/workflows");
}

export async function launchWorkflowAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();

  await startWorkflow({
    tenantId: user.tenantId,
    workflowKey: field(formData, "workflowKey"),
    resourceType: field(formData, "resourceType"),
    resourceId: field(formData, "resourceId"),
    startedByUserId: user.id,
    context:
      json(field(formData, "context"), "Workflow context") ?? {},
  });

  revalidatePath("/app/workflows");
}

export async function decideWorkflowTaskAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();

  await processWorkflowDecision({
    taskId: field(formData, "taskId"),
    userId: user.id,
    userRoles: user.roles,
    decision: field(formData, "decision") as
      | "APPROVE"
      | "REJECT"
      | "RETURN"
      | "COMPLETE",
    comments: field(formData, "comments") || undefined,
  });

  revalidatePath("/app/workflows");
}

export async function createWorkflowDelegationAction(formData: FormData) {
  const user = await requireAuthenticatedIdentity();

  await prisma.workflowDelegation.create({
    data: {
      tenantId: user.tenantId,
      delegatorUserId: user.id,
      delegateUserId: field(formData, "delegateUserId"),
      startsAt: new Date(field(formData, "startsAt")),
      endsAt: new Date(field(formData, "endsAt")),
      reason: field(formData, "reason") || null,
    },
  });

  revalidatePath("/app/settings/workflows/delegations");
}
