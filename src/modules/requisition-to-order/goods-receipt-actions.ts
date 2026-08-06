"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createGoodsReceiptSession,
  postGoodsReceiptSession,
  resolveGoodsReceiptException,
} from "@/core/requisition-to-order/goods-receipt";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createGoodsReceiptSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createGoodsReceiptSession({
    purchaseOrderExecutionId: field(data, "purchaseOrderExecutionId"),
    receivedByUserId: user.id,
    deliveryReference: field(data, "deliveryReference") || null,
    carrierReference: field(data, "carrierReference") || null,
    locationReference: field(data, "locationReference") || null,
    notes: field(data, "notes") || null,
    line: {
      lineReference: field(data, "lineReference"),
      description: field(data, "description"),
      orderedQuantity: Number(field(data, "orderedQuantity")),
      previouslyReceived: Number(field(data, "previouslyReceived") || 0),
      receivedQuantity: Number(field(data, "receivedQuantity")),
      unitOfMeasure: field(data, "unitOfMeasure") || "EA",
      condition: field(data, "condition") as
        | "ACCEPTED"
        | "DAMAGED"
        | "REJECTED"
        | "QUARANTINED",
      serialOrLotReference: field(data, "serialOrLotReference") || null,
    },
  });

  revalidatePath("/app/requisition-to-order/receipts");
}

export async function postGoodsReceiptSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await postGoodsReceiptSession({
    receiptSessionId: field(data, "receiptSessionId"),
    actorUserId: user.id,
    overReceiptTolerancePercent: Number(
      field(data, "overReceiptTolerancePercent") || 0,
    ),
    underReceiptTolerancePercent: Number(
      field(data, "underReceiptTolerancePercent") || 0,
    ),
  });

  revalidatePath("/app/requisition-to-order/receipts");
}

export async function resolveGoodsReceiptExceptionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await resolveGoodsReceiptException({
    exceptionId: field(data, "exceptionId"),
    actorUserId: user.id,
    resolution: field(data, "resolution"),
  });

  revalidatePath("/app/requisition-to-order/receipts");
}
