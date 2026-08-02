"use server";

import { revalidatePath } from "next/cache";
import {
  SupplierDocumentStatus,
  SupplierDocumentType,
} from "@/generated/prisma/enums";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  reviewSupplierDocumentSchema,
  uploadSupplierDocumentSchema,
} from "./document-schemas";
import { uploadPrivateSupplierDocument } from "./documents";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function uploadSupplierDocumentAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "RISK_COMPLIANCE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = uploadSupplierDocumentSchema.parse({
    supplierId: value(formData, "supplierId"),
    type: value(formData, "type"),
    issuedAt: value(formData, "issuedAt"),
    expiresAt: value(formData, "expiresAt"),
  });

  const supplier = await prisma.supplier.findFirstOrThrow({
    where: {
      id: input.supplierId,
      tenantId: user.tenantId,
    },
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("A supplier document file is required.");
  }

  const blob = await uploadPrivateSupplierDocument(
    user.tenantId,
    supplier.id,
    file,
  );

  const document = await prisma.supplierDocument.create({
    data: {
      supplierId: supplier.id,
      type: input.type as SupplierDocumentType,
      status: SupplierDocumentStatus.PENDING_VERIFICATION,
      name: file.name,
      blobPathname: blob.pathname,
      storageUrl: blob.url,
      contentType: file.type,
      sizeBytes: file.size,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "supplier_document.upload",
      resourceType: "SupplierDocument",
      resourceId: document.id,
      after: {
        supplierId: supplier.id,
        type: input.type,
        name: file.name,
        expiresAt: input.expiresAt || null,
      },
    },
  });

  revalidatePath(`/app/suppliers/${supplier.id}`);
}

export async function reviewSupplierDocumentAction(formData: FormData) {
  const user = await requireAnyRole([
    "RISK_COMPLIANCE",
    "SUPPLIER_MANAGER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = reviewSupplierDocumentSchema.parse({
    documentId: value(formData, "documentId"),
    decision: value(formData, "decision"),
    rejectionReason: value(formData, "rejectionReason"),
  });

  const document = await prisma.supplierDocument.findFirstOrThrow({
    where: {
      id: input.documentId,
      supplier: { tenantId: user.tenantId },
    },
    include: { supplier: true },
  });

  const updated = await prisma.supplierDocument.update({
    where: { id: document.id },
    data: {
      status: input.decision as SupplierDocumentStatus,
      verifiedAt: input.decision === "VERIFIED" ? new Date() : null,
      verifiedBy: input.decision === "VERIFIED" ? user.id : null,
      rejectionReason:
        input.decision === "REJECTED"
          ? input.rejectionReason || "Document did not meet verification requirements."
          : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: `supplier_document.${input.decision.toLowerCase()}`,
      resourceType: "SupplierDocument",
      resourceId: document.id,
      before: { status: document.status },
      after: {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
      },
    },
  });

  revalidatePath(`/app/suppliers/${document.supplierId}`);
}
