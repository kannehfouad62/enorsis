"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { sendExecutiveBoardDistribution } from "@/core/executive-board-reporting/email-delivery";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function sendExecutiveBoardDistributionAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await sendExecutiveBoardDistribution({
    tenantId: user.tenantId,
    distributionId: field(data, "distributionId"),
    actorUserId: user.id,
    accessHours: Number(field(data, "accessHours") || "168"),
  });

  revalidatePath("/app/executive/board-distribution");
}
