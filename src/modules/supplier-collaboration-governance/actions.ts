"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function assertSupplier(tenantId: string, supplierId: string) {
  return prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId },
    select: { id: true, supplierNumber: true },
  });
}

export async function shareSupplierDocumentAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  await assertSupplier(user.tenantId, supplierId);

  const record = await prisma.supplierSharedDocument.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title: field(data, "title"),
      description: field(data, "description") || null,
      documentRef: field(data, "documentRef"),
      documentType: field(data, "documentType") || null,
      direction: "BUYER_TO_SUPPLIER",
      sharedByUserId: user.id,
      supplierEmail: field(data, "supplierEmail") || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier collaboration user",
      action: "supplier_collaboration.document.share",
      resourceType: "SupplierSharedDocument",
      resourceId: record.id,
      after: {
        supplierId,
        documentRef: record.documentRef,
        direction: record.direction,
      },
    },
  });

  revalidatePath("/app/supplier-portal/collaboration/requests");
}

export async function createSupplierActionRequestAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  await assertSupplier(user.tenantId, supplierId);

  const request = await prisma.supplierActionRequest.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      requestType: field(data, "requestType") || "GENERAL",
      title: field(data, "title"),
      description: field(data, "description") || null,
      contextType: field(data, "contextType") || null,
      contextReference: field(data, "contextReference") || null,
      priority: field(data, "priority") || "NORMAL",
      supplierEmail: field(data, "supplierEmail") || null,
      dueAt: field(data, "dueAt")
        ? new Date(field(data, "dueAt"))
        : null,
      requestedByUserId: user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier collaboration user",
      action: "supplier_collaboration.action_request.create",
      resourceType: "SupplierActionRequest",
      resourceId: request.id,
      after: {
        supplierId,
        requestType: request.requestType,
        priority: request.priority,
        status: request.status,
      },
    },
  });

  revalidatePath("/app/supplier-portal/collaboration/requests");
}

export async function reviewSupplierActionRequestAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const requestId = field(data, "requestId");
  const decision = field(data, "decision");

  const request = await prisma.supplierActionRequest.findFirstOrThrow({
    where: {
      id: requestId,
      tenantId: user.tenantId,
    },
  });

  const status =
    decision === "COMPLETE"
      ? "COMPLETED"
      : decision === "REOPEN"
        ? "OPEN"
        : "REVIEWED";

  await prisma.supplierActionRequest.update({
    where: { id: request.id },
    data: {
      status,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNotes: field(data, "reviewNotes") || null,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/app/supplier-portal/collaboration/requests");
}
