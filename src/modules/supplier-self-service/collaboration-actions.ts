"use server";

import { revalidatePath } from "next/cache";
import { requireSupplierPortalAccess } from "@/core/supplier-portal/access";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function supplierShareDocumentAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);

  const record = await prisma.supplierSharedDocument.create({
    data: {
      tenantId: access.supplier.tenantId,
      supplierId: access.supplier.id,
      title: field(data, "title"),
      description: field(data, "description") || null,
      documentRef: field(data, "documentRef"),
      documentType: field(data, "documentType") || null,
      direction: "SUPPLIER_TO_BUYER",
      supplierEmail: access.portalUser.email,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: access.supplier.tenantId,
      actorType: "USER",
      actorId: access.portalUser.id,
      actorLabel: access.portalUser.email,
      action: "supplier_self_service.document.share",
      resourceType: "SupplierSharedDocument",
      resourceId: record.id,
      after: {
        supplierId: access.supplier.id,
        documentRef: record.documentRef,
        direction: record.direction,
      },
    },
  });

  revalidatePath(`/supplier/portal/${token}/collaboration`);
}

export async function supplierAcknowledgeDocumentAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);
  const documentId = field(data, "documentId");

  const record = await prisma.supplierSharedDocument.findFirstOrThrow({
    where: {
      id: documentId,
      tenantId: access.supplier.tenantId,
      supplierId: access.supplier.id,
    },
  });

  await prisma.supplierSharedDocument.update({
    where: { id: record.id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedBy: access.portalUser.email,
    },
  });

  revalidatePath(`/supplier/portal/${token}/collaboration`);
}

export async function supplierRespondActionRequestAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);
  const requestId = field(data, "requestId");

  const request = await prisma.supplierActionRequest.findFirstOrThrow({
    where: {
      id: requestId,
      tenantId: access.supplier.tenantId,
      supplierId: access.supplier.id,
    },
  });

  await prisma.supplierActionRequest.update({
    where: { id: request.id },
    data: {
      status: "RESPONDED",
      respondedAt: new Date(),
      responseText: field(data, "responseText") || null,
      responseDocumentRef:
        field(data, "responseDocumentRef") || null,
    },
  });

  revalidatePath(`/supplier/portal/${token}/collaboration`);
}
