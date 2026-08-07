"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  allocateWarehouseFulfillmentOrder,
  completeWarehousePickTask,
  createWarehouseFulfillmentOrder,
  issueWarehouseFulfillmentOrder,
  packWarehouseFulfillmentOrder,
  resolveWarehouseFulfillmentException,
} from "@/core/warehouse-fulfillment/service";

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

export async function createWarehouseFulfillmentOrderAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createWarehouseFulfillmentOrder({
    tenantId: user.tenantId,
    requestType: field(data, "requestType") || null,
    requestId: field(data, "requestId") || null,
    destinationType: field(data, "destinationType") || null,
    destinationId: field(data, "destinationId") || null,
    neededAt: field(data, "neededAt")
      ? new Date(field(data, "neededAt"))
      : null,
    notes: field(data, "notes") || null,
    actorUserId: user.id,
    line: {
      lineReference: field(data, "lineReference"),
      inventoryItemId: field(data, "inventoryItemId"),
      sourceLocationId: field(data, "sourceLocationId"),
      requestedQuantity: Number(field(data, "requestedQuantity")),
      unitOfMeasure: field(data, "unitOfMeasure") || "EA",
      serialLotReference: field(data, "serialLotReference") || null,
    },
  });

  revalidatePath("/app/warehouse-fulfillment");
}

export async function allocateWarehouseFulfillmentOrderAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await allocateWarehouseFulfillmentOrder({
    fulfillmentOrderId: field(data, "fulfillmentOrderId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-fulfillment");
}

export async function completeWarehousePickTaskAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await completeWarehousePickTask({
    pickTaskId: field(data, "pickTaskId"),
    pickedQuantity: Number(field(data, "pickedQuantity")),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-fulfillment");
}

export async function packWarehouseFulfillmentOrderAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await packWarehouseFulfillmentOrder({
    fulfillmentOrderId: field(data, "fulfillmentOrderId"),
    packageType: field(data, "packageType") || null,
    grossWeight: field(data, "grossWeight")
      ? Number(field(data, "grossWeight"))
      : null,
    weightUnit: field(data, "weightUnit") || null,
    carrierReference: field(data, "carrierReference") || null,
    trackingReference: field(data, "trackingReference") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-fulfillment");
}

export async function issueWarehouseFulfillmentOrderAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await issueWarehouseFulfillmentOrder({
    fulfillmentOrderId: field(data, "fulfillmentOrderId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-fulfillment");
}

export async function resolveWarehouseFulfillmentExceptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await resolveWarehouseFulfillmentException({
    exceptionId: field(data, "exceptionId"),
    resolution: field(data, "resolution"),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-fulfillment");
}
