"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createExecutiveBoardReportSchedule,
  processExecutiveBoardReportSchedule,
} from "@/core/executive-board-reporting/scheduling";

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

export async function createExecutiveBoardReportScheduleAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await createExecutiveBoardReportSchedule({
    tenantId: user.tenantId,
    definitionId: field(data, "definitionId"),
    name: field(data, "name"),
    frequency: field(data, "frequency") as
      | "MONTHLY"
      | "QUARTERLY"
      | "ANNUAL",
    dayOfMonth: Number(field(data, "dayOfMonth") || "1"),
    monthOfYear: field(data, "monthOfYear")
      ? Number(field(data, "monthOfYear"))
      : null,
    hourUtc: Number(field(data, "hourUtc") || "8"),
    generateFinalized:
      field(data, "generateFinalized") === "on",
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-calendar");
}

export async function runExecutiveBoardReportScheduleNowAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await processExecutiveBoardReportSchedule({
    scheduleId: field(data, "scheduleId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-calendar");
  revalidatePath("/app/executive/board-reporting");
}
