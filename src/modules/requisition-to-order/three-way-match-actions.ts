"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  approveThreeWayMatchForPayment,
  createThreeWayMatchCase,
  resolveThreeWayMatchException,
} from "@/core/requisition-to-order/three-way-match";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createThreeWayMatchCaseAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createThreeWayMatchCase({
    purchaseOrderExecutionId: field(data, "purchaseOrderExecutionId"),
    goodsReceiptSessionId: field(data, "goodsReceiptSessionId"),
    supplierInvoiceId: field(data, "supplierInvoiceId"),
    invoiceNumber: field(data, "invoiceNumber") || null,
    invoiceAmount: Number(field(data, "invoiceAmount")),
    invoicedQuantity: Number(field(data, "invoicedQuantity")),
    invoiceUnitPrice: Number(field(data, "invoiceUnitPrice")),
    lineReference: field(data, "lineReference"),
    lineDescription: field(data, "lineDescription"),
    amountTolerancePercent: Number(
      field(data, "amountTolerancePercent") || 0,
    ),
    quantityTolerancePercent: Number(
      field(data, "quantityTolerancePercent") || 0,
    ),
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/three-way-match");
}

export async function resolveThreeWayMatchExceptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await resolveThreeWayMatchException({
    exceptionId: field(data, "exceptionId"),
    resolution: field(data, "resolution"),
    actorUserId: user.id,
    waive: data.get("waive") === "on",
  });

  revalidatePath("/app/requisition-to-order/three-way-match");
}

export async function approveThreeWayMatchForPaymentAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "PLATFORM_SUPER_ADMIN",
  ]);

  await approveThreeWayMatchForPayment({
    matchCaseId: field(data, "matchCaseId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/three-way-match");
}
