"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  addExecutiveBoardRecipient,
  createExecutiveBoardDistribution,
  createExecutiveBoardRecipientGroup,
  markExecutiveBoardDistributionSent,
  revokeExecutiveBoardDelivery,
} from "@/core/executive-board-reporting/distribution";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "FINANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
] as const;

export async function createExecutiveBoardRecipientGroupAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createExecutiveBoardRecipientGroup({
    tenantId: user.tenantId,
    name: field(data, "name"),
    groupType: field(data, "groupType") as
      | "BOARD"
      | "AUDIT_COMMITTEE"
      | "RISK_COMMITTEE"
      | "PROCUREMENT_COMMITTEE"
      | "FINANCE_COMMITTEE"
      | "EXECUTIVE_LEADERSHIP"
      | "CUSTOM",
    description: field(data, "description") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-distribution");
}

export async function addExecutiveBoardRecipientAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await addExecutiveBoardRecipient({
    tenantId: user.tenantId,
    groupId: field(data, "groupId"),
    name: field(data, "name"),
    email: field(data, "email"),
    title: field(data, "title") || null,
    organization: field(data, "organization") || null,
  });

  revalidatePath("/app/executive/board-distribution");
}

export async function createExecutiveBoardDistributionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createExecutiveBoardDistribution({
    tenantId: user.tenantId,
    boardPackId: field(data, "boardPackId"),
    recipientGroupId: field(data, "recipientGroupId"),
    actorUserId: user.id,
    subject: field(data, "subject") || null,
    message: field(data, "message") || null,
  });

  revalidatePath("/app/executive/board-distribution");
}

export async function markExecutiveBoardDistributionSentAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await markExecutiveBoardDistributionSent({
    tenantId: user.tenantId,
    distributionId: field(data, "distributionId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-distribution");
}

export async function revokeExecutiveBoardDeliveryAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await revokeExecutiveBoardDelivery({
    tenantId: user.tenantId,
    deliveryId: field(data, "deliveryId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-distribution");
}
