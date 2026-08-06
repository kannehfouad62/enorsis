"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  acknowledgePurchaseOrderExecution,
  createPurchaseOrderExecution,
  createPurchaseOrderRevision,
  issuePurchaseOrderExecution,
  validatePurchaseOrderExecution,
} from "@/core/requisition-to-order";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;
const lines = (data: FormData) => [
  {
    description: field(data, "lineDescription"),
    quantity: Number(field(data, "quantity") || 1),
    unitPrice: Number(field(data, "unitPrice") || 0),
    unitOfMeasure: field(data, "unitOfMeasure") || "EA",
  },
];
const refresh = () => revalidatePath("/app/requisition-to-order/purchase-orders");

export async function createPurchaseOrderExecutionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await createPurchaseOrderExecution({
    journeyId: field(data, "journeyId"),
    supplierId: field(data, "supplierId"),
    contractId: field(data, "contractId") || null,
    currencyCode: field(data, "currencyCode") || "USD",
    lines: lines(data),
    taxAmount: Number(field(data, "taxAmount") || 0),
    freightAmount: Number(field(data, "freightAmount") || 0),
    discountAmount: Number(field(data, "discountAmount") || 0),
    actorUserId: user.id,
  });
  refresh();
}

export async function validatePurchaseOrderExecutionAction(data: FormData) {
  await requireAnyRole([...roles]);
  await validatePurchaseOrderExecution(field(data, "executionId"));
  refresh();
}

export async function issuePurchaseOrderExecutionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await issuePurchaseOrderExecution({
    executionId: field(data, "executionId"),
    actorUserId: user.id,
  });
  refresh();
}

export async function acknowledgePurchaseOrderExecutionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await acknowledgePurchaseOrderExecution({
    executionId: field(data, "executionId"),
    actorUserId: user.id,
  });
  refresh();
}

export async function createPurchaseOrderRevisionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await createPurchaseOrderRevision({
    executionId: field(data, "executionId"),
    reason: field(data, "reason"),
    supplierId: field(data, "supplierId"),
    currencyCode: field(data, "currencyCode") || "USD",
    lines: lines(data),
    actorUserId: user.id,
  });
  refresh();
}
