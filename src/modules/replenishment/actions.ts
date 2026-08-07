"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  approveReplenishmentRecommendation,
  approveStockTransfer,
  generateReplenishmentRecommendations,
  receiveStockTransfer,
  shipStockTransfer,
  upsertReplenishmentPolicy,
} from "@/core/replenishment/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function upsertReplenishmentPolicyAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await upsertReplenishmentPolicy({
    tenantId: user.tenantId,
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId"),
    minimumQuantity: Number(field(data, "minimumQuantity")),
    maximumQuantity: Number(field(data, "maximumQuantity")),
    reorderQuantity: field(data, "reorderQuantity")
      ? Number(field(data, "reorderQuantity"))
      : null,
    sourceLocationId: field(data, "sourceLocationId") || null,
    leadTimeDays: Number(field(data, "leadTimeDays") || 0),
    safetyStockQuantity: Number(field(data, "safetyStockQuantity") || 0),
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
  });

  revalidatePath("/app/replenishment");
}

export async function generateReplenishmentRecommendationsAction() {
  const user = await requireAnyRole([...roles]);

  await generateReplenishmentRecommendations({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/replenishment");
}

export async function approveReplenishmentRecommendationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await approveReplenishmentRecommendation({
    recommendationId: field(data, "recommendationId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/replenishment");
}

export async function approveStockTransferAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await approveStockTransfer({
    transferId: field(data, "transferId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/replenishment");
}

export async function shipStockTransferAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await shipStockTransfer({
    transferId: field(data, "transferId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/replenishment");
}

export async function receiveStockTransferAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await receiveStockTransfer({
    transferId: field(data, "transferId"),
    receivedQuantity: Number(field(data, "receivedQuantity")),
    actorUserId: user.id,
  });

  revalidatePath("/app/replenishment");
}
