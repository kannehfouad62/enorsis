"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  assessPurchaseRequestSubmission,
  submitAssessedPurchaseRequest,
} from "@/core/requisition-to-order";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function assessPurchaseRequestAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "REQUESTER",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await assessPurchaseRequestSubmission({
    journeyId: field(data, "journeyId"),
    purchaseRequestId: field(data, "purchaseRequestId"),
    requestTitle: field(data, "requestTitle") || null,
    requestNumber: field(data, "requestNumber") || null,
    currencyCode: field(data, "currencyCode") || "USD",
    declaredLineCount: Number(field(data, "declaredLineCount") || 0),
    declaredTotalAmount: field(data, "declaredTotalAmount")
      ? Number(field(data, "declaredTotalAmount"))
      : null,
    businessJustification: field(data, "businessJustification") || null,
    budgetReference: field(data, "budgetReference") || null,
    costCenterReference: field(data, "costCenterReference") || null,
    requiredByDate: field(data, "requiredByDate")
      ? new Date(field(data, "requiredByDate"))
      : null,
    supplierRequired: data.get("supplierRequired") === "on",
    supplierId: field(data, "supplierId") || null,
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/purchase-request");
}

export async function submitAssessedPurchaseRequestAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "REQUESTER",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await submitAssessedPurchaseRequest({
    assessmentId: field(data, "assessmentId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/purchase-request");
}
