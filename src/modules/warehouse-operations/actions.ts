"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  completePutawayTask,
  configureWarehouseLocation,
  createPutawayTask,
  createWarehouseReceivingSession,
  resolveWarehouseDiscrepancy,
} from "@/core/warehouse-operations/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "WAREHOUSE_OPERATOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createWarehouseReceivingSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  const receiving = await createWarehouseReceivingSession({
    tenantId: user.tenantId,
    sourceType: field(data, "sourceType") || null,
    sourceId: field(data, "sourceId") || null,
    purchaseOrderId: field(data, "purchaseOrderId") || null,
    goodsReceiptSessionId: field(data, "goodsReceiptSessionId") || null,
    supplierId: field(data, "supplierId") || null,
    dockLocationId: field(data, "dockLocationId") || null,
    carrierReference: field(data, "carrierReference") || null,
    deliveryReference: field(data, "deliveryReference") || null,
    actorUserId: user.id,
    line: {
      lineReference: field(data, "lineReference"),
      inventoryItemId: field(data, "inventoryItemId"),
      description: field(data, "description"),
      expectedQuantity: Number(field(data, "expectedQuantity")),
      receivedQuantity: Number(field(data, "receivedQuantity")),
      unitOfMeasure: field(data, "unitOfMeasure") || "EA",
      condition: field(data, "condition") as
        | "RECEIVED"
        | "DAMAGED"
        | "REJECTED"
        | "QUARANTINED",
      serialLotReference: field(data, "serialLotReference") || null,
    },
  });

  if (field(data, "sourceType") === "MARKETPLACE_ORDER") {
    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "warehouse.marketplace_receiving.recorded",
        resourceType: "WarehouseReceivingSession",
        resourceId: receiving.id,
        after: {
          receivingNumber: receiving.receivingNumber,
          marketplaceSellerOrderId: field(data, "sourceId"),
          purchaseOrderExecutionId:
            field(data, "purchaseOrderId") || null,
          supplierId: field(data, "supplierId") || null,
          lineReference: field(data, "lineReference"),
          inventoryItemId: field(data, "inventoryItemId"),
          description: field(data, "description"),
          expectedQuantity: Number(field(data, "expectedQuantity")),
          receivedQuantity: Number(field(data, "receivedQuantity")),
          condition: field(data, "condition"),
          serialLotReference:
            field(data, "serialLotReference") || null,
          carrierReference:
            field(data, "carrierReference") || null,
          deliveryReference:
            field(data, "deliveryReference") || null,
        },
      },
    });
  }

  revalidatePath("/app/warehouse-operations");
}

export async function configureWarehouseLocationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await configureWarehouseLocation({
    tenantId: user.tenantId,
    locationId: field(data, "locationId"),
    warehouseCode: field(data, "warehouseCode") || null,
    zoneCode: field(data, "zoneCode") || null,
    aisleCode: field(data, "aisleCode") || null,
    binCode: field(data, "binCode") || null,
    capacityQuantity: field(data, "capacityQuantity")
      ? Number(field(data, "capacityQuantity"))
      : null,
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
    allowsMixedItems: data.get("allowsMixedItems") === "on",
    requiresLot: data.get("requiresLot") === "on",
    requiresSerial: data.get("requiresSerial") === "on",
    quarantineOnly: data.get("quarantineOnly") === "on",
  });

  revalidatePath("/app/warehouse-operations");
}

export async function createPutawayTaskAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createPutawayTask({
    receivingSessionId: field(data, "receivingSessionId"),
    receiptLineId: field(data, "receiptLineId"),
    destinationControlId: field(data, "destinationControlId"),
    quantity: Number(field(data, "quantity")),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-operations");
}

export async function completePutawayTaskAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await completePutawayTask({
    taskId: field(data, "taskId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-operations");
}

export async function resolveWarehouseDiscrepancyAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await resolveWarehouseDiscrepancy({
    discrepancyId: field(data, "discrepancyId"),
    resolution: field(data, "resolution"),
    actorUserId: user.id,
  });

  revalidatePath("/app/warehouse-operations");
}
