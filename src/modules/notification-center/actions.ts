"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createEnterpriseNotification,
  markNotificationRead,
} from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNotificationTemplateAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.enterpriseNotificationTemplate.create({
    data: {
      tenantId: user.tenantId,
      key: field(data, "key"),
      name: field(data, "name"),
      description: field(data, "description") || null,
      eventType: field(data, "eventType") || null,
      channel: field(data, "channel") as
        | "IN_APP"
        | "EMAIL"
        | "MOBILE_PUSH"
        | "SMS"
        | "MICROSOFT_TEAMS"
        | "SLACK"
        | "WEBHOOK",
      subjectTemplate: field(data, "subjectTemplate") || null,
      bodyTemplate: field(data, "bodyTemplate"),
      actionUrlTemplate:
        field(data, "actionUrlTemplate") || null,
      locale: field(data, "locale") || "en-US",
    },
  });

  revalidatePath("/app/settings/notifications");
}

export async function sendTestNotificationAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await createEnterpriseNotification({
    tenantId: user.tenantId,
    eventType: "Notification.Tested",
    recipientUserId: field(data, "recipientUserId") || user.id,
    recipientAddress: field(data, "recipientAddress") || null,
    title: field(data, "title"),
    message: field(data, "message"),
    actionUrl: field(data, "actionUrl") || null,
    channels: field(data, "recipientAddress")
      ? ["IN_APP", "EMAIL"]
      : ["IN_APP"],
  });

  revalidatePath("/app/settings/notifications");
}

export async function markNotificationReadAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "REQUESTER",
    "APPROVER",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "LEGAL",
    "RISK_COMPLIANCE",
    "SUPPLIER_MANAGER",
    "AUDITOR",
    "VIEWER",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await markNotificationRead({
    notificationId: field(data, "notificationId"),
    userId: user.id,
  });

  revalidatePath("/app/notifications");
}
