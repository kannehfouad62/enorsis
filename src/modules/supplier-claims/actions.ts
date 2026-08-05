"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createSupplierClaimAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const count = await prisma.supplierClaim.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.supplierClaim.create({
    data: {
      tenantId: user.tenantId,
      supplierId: field(data, "supplierId"),
      claimNumber: `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      type: field(data, "type") as
        | "DAMAGED_GOODS"
        | "SHORT_SHIPMENT"
        | "OVER_SHIPMENT"
        | "WRONG_ITEM"
        | "QUALITY_DEFECT"
        | "WARRANTY"
        | "LATE_DELIVERY"
        | "PRICING_ERROR"
        | "FREIGHT_DAMAGE"
        | "OTHER",
      title: field(data, "title"),
      description: field(data, "description"),
      purchaseOrderId: field(data, "purchaseOrderId") || null,
      receiptId: field(data, "receiptId") || null,
      shipmentId: field(data, "shipmentId") || null,
      invoiceId: field(data, "invoiceId") || null,
      currencyCode: field(data, "currencyCode") || "USD",
      claimedAmount: Number(field(data, "claimedAmount") || 0),
      quantityAffected: field(data, "quantityAffected")
        ? Number(field(data, "quantityAffected"))
        : null,
      unitOfMeasure: field(data, "unitOfMeasure") || null,
      detectedAt: new Date(field(data, "detectedAt")),
      dueAt: field(data, "dueAt")
        ? new Date(field(data, "dueAt"))
        : null,
      ownerUserId: user.id,
      internalAssessment: field(data, "internalAssessment") || null,
    },
  });

  revalidatePath("/app/claims");
}

export async function submitSupplierClaimAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const id = field(data, "claimId");
  const claim = await prisma.supplierClaim.findFirstOrThrow({
    where: { id, tenantId: user.tenantId, status: "DRAFT" },
  });

  await prisma.supplierClaim.update({
    where: { id: claim.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  revalidatePath("/app/claims");
}

export async function addClaimEvidenceAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierClaimId = field(data, "supplierClaimId");

  await prisma.supplierClaim.findFirstOrThrow({
    where: { id: supplierClaimId, tenantId: user.tenantId },
  });

  await prisma.supplierClaimEvidence.create({
    data: {
      supplierClaimId,
      fileName: field(data, "fileName"),
      fileUrl: field(data, "fileUrl"),
      mimeType: field(data, "mimeType") || null,
      description: field(data, "description") || null,
      uploadedByUserId: user.id,
    },
  });

  revalidatePath("/app/claims");
}

export async function updateClaimAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const id = field(data, "claimId");
  const claim = await prisma.supplierClaim.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });
  const status = field(data, "status") as
    | "UNDER_REVIEW"
    | "ACCEPTED"
    | "PARTIALLY_ACCEPTED"
    | "REJECTED"
    | "SETTLED"
    | "CLOSED";

  await prisma.supplierClaim.update({
    where: { id: claim.id },
    data: {
      status,
      acceptedAmount: field(data, "acceptedAmount")
        ? Number(field(data, "acceptedAmount"))
        : claim.acceptedAmount,
      settledAmount: field(data, "settledAmount")
        ? Number(field(data, "settledAmount"))
        : claim.settledAmount,
      supplierResponse: field(data, "supplierResponse") || claim.supplierResponse,
      rootCause: field(data, "rootCause") || claim.rootCause,
      correctiveAction: field(data, "correctiveAction") || claim.correctiveAction,
      disposition: field(data, "disposition")
        ? (field(data, "disposition") as
            | "RETURN_TO_SUPPLIER"
            | "REPLACE"
            | "REPAIR"
            | "SCRAP"
            | "USE_AS_IS"
            | "CREDIT_ONLY")
        : claim.disposition,
      respondedAt: new Date(),
      resolvedAt: ["SETTLED", "CLOSED"].includes(status)
        ? new Date()
        : claim.resolvedAt,
    },
  });

  revalidatePath("/app/claims");
}

export async function createRecoveryAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierClaimId = field(data, "supplierClaimId");
  const claim = await prisma.supplierClaim.findFirstOrThrow({
    where: { id: supplierClaimId, tenantId: user.tenantId },
  });

  await prisma.supplierRecovery.create({
    data: {
      supplierClaimId,
      type: field(data, "type") as
        | "CREDIT_NOTE"
        | "DEBIT_MEMO"
        | "CASH_REFUND"
        | "REPLACEMENT"
        | "SERVICE_CREDIT"
        | "PRICE_ADJUSTMENT"
        | "OTHER",
      amount: Number(field(data, "amount")),
      currencyCode: field(data, "currencyCode") || claim.currencyCode,
      referenceNumber: field(data, "referenceNumber") || null,
      notes: field(data, "notes") || null,
    },
  });

  revalidatePath("/app/claims");
}
