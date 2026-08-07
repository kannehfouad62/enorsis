"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createInventoryTraceUnit,
  markExpiredTraceUnits,
  recordInventoryTraceEvent,
  releaseInventoryTraceHold,
} from "@/core/inventory-traceability/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createInventoryTraceUnitAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createInventoryTraceUnit({
    tenantId: user.tenantId,
    unitType: field(data, "unitType") as "LOT" | "SERIAL",
    inventoryItemId: field(data, "inventoryItemId"),
    lotNumber: field(data, "lotNumber") || null,
    serialNumber: field(data, "serialNumber") || null,
    currentLocationId: field(data, "currentLocationId") || null,
    quantity: Number(field(data, "quantity") || 1),
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
    manufactureDate: field(data, "manufactureDate")
      ? new Date(field(data, "manufactureDate"))
      : null,
    receivedDate: field(data, "receivedDate")
      ? new Date(field(data, "receivedDate"))
      : null,
    expiryDate: field(data, "expiryDate")
      ? new Date(field(data, "expiryDate"))
      : null,
    supplierId: field(data, "supplierId") || null,
    sourceReferenceType: field(data, "sourceReferenceType") || null,
    sourceReferenceId: field(data, "sourceReferenceId") || null,
    notes: field(data, "notes") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-traceability");
}

export async function recordInventoryTraceEventAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await recordInventoryTraceEvent({
    traceUnitId: field(data, "traceUnitId"),
    eventType: field(data, "eventType") as
      | "RECEIVED"
      | "PUTAWAY"
      | "TRANSFERRED"
      | "RESERVED"
      | "PICKED"
      | "ISSUED"
      | "ADJUSTED"
      | "QUARANTINED"
      | "RELEASED"
      | "RECALLED"
      | "EXPIRED"
      | "SCRAPPED"
      | "COUNTED",
    movementLedgerId: field(data, "movementLedgerId") || null,
    referenceType: field(data, "referenceType") || null,
    referenceId: field(data, "referenceId") || null,
    fromLocationId: field(data, "fromLocationId") || null,
    toLocationId: field(data, "toLocationId") || null,
    quantity: field(data, "quantity")
      ? Number(field(data, "quantity"))
      : null,
    notes: field(data, "notes") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-traceability");
}

export async function releaseInventoryTraceHoldAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await releaseInventoryTraceHold({
    holdId: field(data, "holdId"),
    releaseReason: field(data, "releaseReason"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-traceability");
}

export async function markExpiredTraceUnitsAction() {
  const user = await requireAnyRole([...roles]);

  await markExpiredTraceUnits({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-traceability");
}
