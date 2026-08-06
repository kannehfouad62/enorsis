"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createInventoryMovement,
  createInventoryReservation,
  postInventoryMovement,
  resolveInventoryOperationException,
} from "@/core/inventory-operations/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createInventoryMovementAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createInventoryMovement({
    tenantId: user.tenantId,
    movementType: field(data, "movementType") as
      | "RECEIPT"
      | "ISSUE"
      | "TRANSFER"
      | "ADJUSTMENT_IN"
      | "ADJUSTMENT_OUT"
      | "RETURN"
      | "SCRAP"
      | "CYCLE_COUNT",
    inventoryItemId: field(data, "inventoryItemId"),
    fromLocationId: field(data, "fromLocationId") || null,
    toLocationId: field(data, "toLocationId") || null,
    quantity: Number(field(data, "quantity")),
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
    unitCost: field(data, "unitCost") ? Number(field(data, "unitCost")) : null,
    currencyCode: field(data, "currencyCode") || "USD",
    referenceType: field(data, "referenceType") || null,
    referenceId: field(data, "referenceId") || null,
    serialLotReference: field(data, "serialLotReference") || null,
    reason: field(data, "reason") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-operations");
}

export async function postInventoryMovementAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await postInventoryMovement({
    movementId: field(data, "movementId"),
    actorUserId: user.id,
  });
  revalidatePath("/app/inventory-operations");
}

export async function createInventoryReservationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await createInventoryReservation({
    tenantId: user.tenantId,
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId"),
    requestedQuantity: Number(field(data, "requestedQuantity")),
    referenceType: field(data, "referenceType") || null,
    referenceId: field(data, "referenceId") || null,
    actorUserId: user.id,
  });
  revalidatePath("/app/inventory-operations");
}

export async function resolveInventoryOperationExceptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  await resolveInventoryOperationException({
    exceptionId: field(data, "exceptionId"),
    resolution: field(data, "resolution"),
    actorUserId: user.id,
  });
  revalidatePath("/app/inventory-operations");
}
