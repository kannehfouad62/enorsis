"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  approveInventoryReconciliation,
  completeInventoryCountSession,
  createInventoryCountSession,
  postInventoryReconciliation,
  recordInventoryCountLine,
} from "@/core/inventory-reconciliation/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createInventoryCountSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createInventoryCountSession({
    tenantId: user.tenantId,
    countType: field(data, "countType") || null,
    locationId: field(data, "locationId") || null,
    notes: field(data, "notes") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-reconciliation");
}

export async function recordInventoryCountLineAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await recordInventoryCountLine({
    countSessionId: field(data, "countSessionId"),
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId"),
    countedQuantity: Number(field(data, "countedQuantity")),
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
    serialLotReference: field(data, "serialLotReference") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-reconciliation");
}

export async function completeInventoryCountSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await completeInventoryCountSession({
    countSessionId: field(data, "countSessionId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-reconciliation");
}

export async function approveInventoryReconciliationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await approveInventoryReconciliation({
    reconciliationId: field(data, "reconciliationId"),
    reason: field(data, "reason"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-reconciliation");
}

export async function postInventoryReconciliationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await postInventoryReconciliation({
    reconciliationId: field(data, "reconciliationId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-reconciliation");
}
