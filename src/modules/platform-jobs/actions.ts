"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { queuePlatformJob } from "@/core/jobs";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createPlatformJobDefinitionAction(data: FormData) {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.platformJobDefinition.create({
    data: {
      key: field(data, "key"),
      name: field(data, "name"),
      description: field(data, "description") || null,
      handlerKey: field(data, "handlerKey"),
      scheduleExpression: field(data, "scheduleExpression") || null,
      timeZone: field(data, "timeZone") || "UTC",
      maxAttempts: Number(field(data, "maxAttempts") || 3),
      retryDelaySeconds: Number(field(data, "retryDelaySeconds") || 300),
      timeoutSeconds: Number(field(data, "timeoutSeconds") || 300),
      concurrencyKey: field(data, "concurrencyKey") || null,
      tenantScoped: data.get("tenantScoped") === "on",
    },
  });

  revalidatePath("/app/settings/jobs");
}

export async function queuePlatformJobAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
    "TENANT_OWNER",
    "TENANT_ADMIN",
  ]);

  await queuePlatformJob({
    jobKey: field(data, "jobKey"),
    tenantId: field(data, "tenantId") || user.tenantId,
    requestedByUserId: user.id,
  });

  revalidatePath("/app/settings/jobs");
}

export async function changePlatformJobStatusAction(data: FormData) {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.platformJobDefinition.update({
    where: { id: field(data, "jobDefinitionId") },
    data: {
      status: field(data, "status") as
        | "ACTIVE"
        | "PAUSED"
        | "DISABLED",
    },
  });

  revalidatePath("/app/settings/jobs");
}
