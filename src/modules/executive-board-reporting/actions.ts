"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  finalizeExecutiveBoardPack,
  generateExecutiveBoardPack,
} from "@/core/executive-board-reporting/service";

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

export async function generateExecutiveBoardPackAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await generateExecutiveBoardPack({
    tenantId: user.tenantId,
    definitionKey: field(data, "definitionKey"),
    actorUserId: user.id,
    periodType:
      (field(data, "periodType") as
        | "MONTHLY"
        | "QUARTERLY"
        | "ANNUAL"
        | "AD_HOC") || null,
  });

  revalidatePath("/app/executive/board-reporting");
}

export async function finalizeExecutiveBoardPackAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await finalizeExecutiveBoardPack({
    tenantId: user.tenantId,
    packId: field(data, "packId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/board-reporting");
}
