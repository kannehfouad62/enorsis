"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { requireSupplierPortalAccess } from "@/core/supplier-portal/access";
import { prisma } from "@/lib/prisma";

const buyerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function issueSupplierSelfServiceAccessAction(
  data: FormData,
) {
  const user = await requireAnyRole([...buyerRoles]);
  const supplierId = field(data, "supplierId");
  const email = field(data, "email").toLowerCase();

  await prisma.supplier.findFirstOrThrow({
    where: {
      id: supplierId,
      tenantId: user.tenantId,
    },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256")
    .update(rawToken)
    .digest("hex");

  await prisma.$transaction([
    prisma.supplierPortalInvitation.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        email,
        contactName: field(data, "contactName") || null,
        tokenHash,
        invitedByUserId: user.id,
        expiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      },
    }),
    prisma.supplierPortalUser.upsert({
      where: {
        tenantId_supplierId_email: {
          tenantId: user.tenantId,
          supplierId,
          email,
        },
      },
      update: {
        name: field(data, "contactName") || undefined,
        jobTitle: field(data, "jobTitle") || undefined,
        status: "INVITED",
        invitedAt: new Date(),
      },
      create: {
        tenantId: user.tenantId,
        supplierId,
        email,
        name: field(data, "contactName") || null,
        jobTitle: field(data, "jobTitle") || null,
      },
    }),
  ]);

  const baseUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "https://www.enorsis.com";

  const portalUrl =
    `${baseUrl.replace(/\/$/, "")}/supplier/portal/${rawToken}`;

  redirect(
    `/app/supplier-portal/access?portalUrl=${encodeURIComponent(
      portalUrl,
    )}`,
  );
}

export async function supplierSubmitInvoiceAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);

  const invoice =
    await prisma.supplierCollaborationInvoice.create({
      data: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
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
        supplierEmail: access.portalUser.email,
        notes: field(data, "notes") || null,
        attachmentRef:
          field(data, "attachmentRef") || null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: access.supplier.tenantId,
      actorType: "USER",
      actorId: access.portalUser.id,
      actorLabel: access.portalUser.email,
      action: "supplier_self_service.invoice.submit",
      resourceType: "SupplierCollaborationInvoice",
      resourceId: invoice.id,
      after: {
        supplierId: access.supplier.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
    },
  });

  revalidatePath(`/supplier/portal/${token}`);
}

export async function supplierSubmitShipmentAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);

  const shipment =
    await prisma.supplierCollaborationShipment.create({
      data: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
        purchaseOrderRef:
          field(data, "purchaseOrderRef") || null,
        shipmentReference: field(
          data,
          "shipmentReference",
        ),
        trackingNumber:
          field(data, "trackingNumber") || null,
        carrierName: field(data, "carrierName") || null,
        status: field(data, "status") || "IN_TRANSIT",
        origin: field(data, "origin") || null,
        destination: field(data, "destination") || null,
        estimatedDeliveryAt: field(
          data,
          "estimatedDeliveryAt",
        )
          ? new Date(field(data, "estimatedDeliveryAt"))
          : null,
        supplierEmail: access.portalUser.email,
        notes: field(data, "notes") || null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: access.supplier.tenantId,
      actorType: "USER",
      actorId: access.portalUser.id,
      actorLabel: access.portalUser.email,
      action: "supplier_self_service.shipment.submit",
      resourceType: "SupplierCollaborationShipment",
      resourceId: shipment.id,
      after: {
        supplierId: access.supplier.id,
        shipmentReference: shipment.shipmentReference,
        status: shipment.status,
      },
    },
  });

  revalidatePath(`/supplier/portal/${token}`);
}

export async function supplierStartConversationAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);
  const body = field(data, "body");
  const subject = field(data, "subject");

  await prisma.$transaction(async (tx) => {
    const thread =
      await tx.supplierConversationThread.create({
        data: {
          tenantId: access.supplier.tenantId,
          supplierId: access.supplier.id,
          subject,
          contextType:
            field(data, "contextType") || null,
          contextReference:
            field(data, "contextReference") || null,
          priority: field(data, "priority") || "NORMAL",
          supplierEmail: access.portalUser.email,
        },
      });

    await tx.supplierConversationMessage.create({
      data: {
        tenantId: access.supplier.tenantId,
        threadId: thread.id,
        senderType: "SUPPLIER",
        senderId: access.portalUser.id,
        senderEmail: access.portalUser.email,
        body,
        readBySupplierAt: new Date(),
      },
    });
  });

  revalidatePath(`/supplier/portal/${token}`);
}

export async function supplierReplyConversationAction(
  token: string,
  data: FormData,
) {
  const access = await requireSupplierPortalAccess(token);
  const threadId = field(data, "threadId");

  const thread =
    await prisma.supplierConversationThread.findFirstOrThrow({
      where: {
        id: threadId,
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
    });

  await prisma.$transaction([
    prisma.supplierConversationMessage.create({
      data: {
        tenantId: access.supplier.tenantId,
        threadId,
        senderType: "SUPPLIER",
        senderId: access.portalUser.id,
        senderEmail: access.portalUser.email,
        body: field(data, "body"),
        readBySupplierAt: new Date(),
      },
    }),
    prisma.supplierConversationThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  revalidatePath(`/supplier/portal/${token}`);
}
