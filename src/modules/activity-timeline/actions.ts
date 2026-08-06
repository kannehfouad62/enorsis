"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { recordEnterpriseActivity } from "@/core/activity";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function recordTestActivityAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await recordEnterpriseActivity({
    tenantId: user.tenantId,
    activityType: field(data, "activityType"),
    sourceModule: field(data, "sourceModule") || "activity-console",
    title: field(data, "title"),
    description: field(data, "description") || null,
    severity: field(data, "severity") as
      | "INFO"
      | "SUCCESS"
      | "WARNING"
      | "ERROR"
      | "CRITICAL",
    visibility: field(data, "visibility") as
      | "TENANT"
      | "RESTRICTED"
      | "PRIVATE"
      | "PLATFORM",
    actorUserId: user.id,
    actorRole: user.roles[0] ?? null,
    subjectType: field(data, "subjectType") || null,
    subjectId: field(data, "subjectId") || null,
    subjectLabel: field(data, "subjectLabel") || null,
    actionUrl: field(data, "actionUrl") || null,
    metadata: {
      createdFrom: "activity-administration",
    },
  });

  revalidatePath("/app/settings/activity");
  revalidatePath("/app/activity");
}
