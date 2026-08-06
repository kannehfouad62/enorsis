"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  approvePaymentReadiness,
  assessPaymentReadiness,
  assignPaymentBatch,
  releasePaymentHold,
} from "@/core/requisition-to-order/payment-readiness";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function assessPaymentReadinessAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await assessPaymentReadiness({
    threeWayMatchCaseId: field(data, "threeWayMatchCaseId"),
    supplierInvoiceId: field(data, "supplierInvoiceId"),
    invoiceNumber: field(data, "invoiceNumber") || null,
    supplierId: field(data, "supplierId") || null,
    dueDate: field(data, "dueDate") ? new Date(field(data, "dueDate")) : null,
    discountDate: field(data, "discountDate") ? new Date(field(data, "discountDate")) : null,
    discountAmount: field(data, "discountAmount") ? Number(field(data, "discountAmount")) : null,
    bankDetailsVerified: data.get("bankDetailsVerified") === "on",
    supplierCompliant: data.get("supplierCompliant") === "on",
    taxValidated: data.get("taxValidated") === "on",
    duplicateInvoiceDetected: data.get("duplicateInvoiceDetected") === "on",
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/payment-readiness");
}

export async function releasePaymentHoldAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await releasePaymentHold({
    holdId: field(data, "holdId"),
    releaseReason: field(data, "releaseReason"),
    actorUserId: user.id,
  });
  revalidatePath("/app/requisition-to-order/payment-readiness");
}

export async function approvePaymentReadinessAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await approvePaymentReadiness({
    readinessCaseId: field(data, "readinessCaseId"),
    actorUserId: user.id,
  });
  revalidatePath("/app/requisition-to-order/payment-readiness");
}

export async function assignPaymentBatchAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await assignPaymentBatch({
    readinessCaseId: field(data, "readinessCaseId"),
    paymentBatchId: field(data, "paymentBatchId"),
    actorUserId: user.id,
  });
  revalidatePath("/app/requisition-to-order/payment-readiness");
}
