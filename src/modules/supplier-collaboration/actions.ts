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
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function requireSupplier(
  tenantId: string,
  supplierId: string,
) {
  return prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId },
    select: {
      id: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
    },
  });
}

export async function recordSupplierInvoiceAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  const supplier = await requireSupplier(
    user.tenantId,
    supplierId,
  );

  const invoice = await prisma.supplierCollaborationInvoice.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      invoiceNumber: field(data, "invoiceNumber"),
      purchaseOrderRef:
        field(data, "purchaseOrderRef") || null,
      currencyCode:
        field(data, "currencyCode").toUpperCase() || "USD",
      invoiceAmount: field(data, "invoiceAmount"),
      invoiceDate: new Date(field(data, "invoiceDate")),
      dueDate: field(data, "dueDate")
        ? new Date(field(data, "dueDate"))
        : null,
      supplierEmail: field(data, "supplierEmail") || null,
      notes: field(data, "notes") || null,
      attachmentRef:
        field(data, "attachmentRef") || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier collaboration user",
      action: "supplier_collaboration.invoice.record",
      resourceType: "SupplierCollaborationInvoice",
      resourceId: invoice.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
    },
  });

  revalidatePath("/app/supplier-portal/collaboration");
}

export async function recordSupplierShipmentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  const supplier = await requireSupplier(
    user.tenantId,
    supplierId,
  );

  const shipment =
    await prisma.supplierCollaborationShipment.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        shipmentReference: field(
          data,
          "shipmentReference",
        ),
        purchaseOrderRef:
          field(data, "purchaseOrderRef") || null,
        trackingNumber:
          field(data, "trackingNumber") || null,
        carrierName: field(data, "carrierName") || null,
        status: field(data, "status") || "PLANNED",
        origin: field(data, "origin") || null,
        destination: field(data, "destination") || null,
        estimatedDeliveryAt: field(
          data,
          "estimatedDeliveryAt",
        )
          ? new Date(field(data, "estimatedDeliveryAt"))
          : null,
        supplierEmail:
          field(data, "supplierEmail") || null,
        notes: field(data, "notes") || null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier collaboration user",
      action: "supplier_collaboration.shipment.record",
      resourceType: "SupplierCollaborationShipment",
      resourceId: shipment.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        shipmentReference: shipment.shipmentReference,
        status: shipment.status,
      },
    },
  });

  revalidatePath("/app/supplier-portal/collaboration");
}

export async function createSupplierConversationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  await requireSupplier(user.tenantId, supplierId);

  const subject = field(data, "subject");
  const body = field(data, "body");

  if (subject.length < 3 || body.length < 2) {
    throw new Error("Conversation subject and message are required.");
  }

  await prisma.$transaction(async (tx) => {
    const thread = await tx.supplierConversationThread.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        subject,
        contextType: field(data, "contextType") || null,
        contextReference:
          field(data, "contextReference") || null,
        priority: field(data, "priority") || "NORMAL",
        buyerOwnerUserId: user.id,
        supplierEmail:
          field(data, "supplierEmail") || null,
      },
    });

    await tx.supplierConversationMessage.create({
      data: {
        tenantId: user.tenantId,
        threadId: thread.id,
        senderType: "BUYER",
        senderId: user.id,
        senderEmail: user.email ?? null,
        body,
        readByBuyerAt: new Date(),
      },
    });
  });

  revalidatePath("/app/supplier-portal/collaboration");
}

export async function replySupplierConversationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const threadId = field(data, "threadId");
  const body = field(data, "body");

  const thread = await prisma.supplierConversationThread.findFirstOrThrow({
    where: {
      id: threadId,
      tenantId: user.tenantId,
    },
  });

  await prisma.$transaction([
    prisma.supplierConversationMessage.create({
      data: {
        tenantId: user.tenantId,
        threadId,
        senderType: "BUYER",
        senderId: user.id,
        senderEmail: user.email ?? null,
        body,
        readByBuyerAt: new Date(),
      },
    }),
    prisma.supplierConversationThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  revalidatePath("/app/supplier-portal/collaboration");
}
