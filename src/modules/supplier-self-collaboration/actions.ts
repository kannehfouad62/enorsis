"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
]);

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function requireSupplierActor() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      allowedRoles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const supplier = await ensureTenantSelfSupplierProfile({
    tenantId: session.user.tenantId,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
  });

  return {
    user: session.user,
    supplier,
  };
}

function revalidateSupplierCollaboration() {
  revalidatePath("/app/supplier-portal");
  revalidatePath("/app/supplier-portal/collaboration");
  revalidatePath(
    "/app/supplier-portal/collaboration/requests",
  );
}

export async function submitSupplierInvoiceAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const invoiceNumber = field(data, "invoiceNumber");
  const invoiceAmount = field(data, "invoiceAmount");
  const invoiceDate = field(data, "invoiceDate");

  if (!invoiceNumber) {
    throw new Error("Invoice number is required.");
  }

  if (
    !invoiceAmount ||
    Number.isNaN(Number(invoiceAmount)) ||
    Number(invoiceAmount) <= 0
  ) {
    throw new Error(
      "Invoice amount must be greater than zero.",
    );
  }

  if (!invoiceDate) {
    throw new Error("Invoice date is required.");
  }

  const invoice =
    await prisma.supplierCollaborationInvoice.create({
      data: {
        tenantId: user.tenantId,
        supplierId: supplier.id,
        invoiceNumber,
        purchaseOrderRef:
          field(data, "purchaseOrderRef") || null,
        currencyCode:
          field(data, "currencyCode").toUpperCase() ||
          "USD",
        invoiceAmount,
        invoiceDate: new Date(invoiceDate),
        dueDate: field(data, "dueDate")
          ? new Date(field(data, "dueDate"))
          : null,
        supplierEmail: user.email ?? null,
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
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action: "supplier_self_collaboration.invoice.submit",
      resourceType: "SupplierCollaborationInvoice",
      resourceId: invoice.id,
      after: {
        supplierId: supplier.id,
        supplierNumber: supplier.supplierNumber,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function submitSupplierShipmentAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const shipmentReference = field(
    data,
    "shipmentReference",
  );

  if (!shipmentReference) {
    throw new Error("Shipment reference is required.");
  }

  const status = field(data, "status") || "PLANNED";

  const validStatuses = new Set([
    "PLANNED",
    "BOOKED",
    "IN_TRANSIT",
    "DELAYED",
    "DELIVERED",
    "CANCELLED",
  ]);

  if (!validStatuses.has(status)) {
    throw new Error("Invalid shipment status.");
  }

  const shipment =
    await prisma.supplierCollaborationShipment.upsert({
      where: {
        tenantId_supplierId_shipmentReference: {
          tenantId: user.tenantId,
          supplierId: supplier.id,
          shipmentReference,
        },
      },
      update: {
        purchaseOrderRef:
          field(data, "purchaseOrderRef") || null,
        trackingNumber:
          field(data, "trackingNumber") || null,
        carrierName:
          field(data, "carrierName") || null,
        status,
        origin: field(data, "origin") || null,
        destination: field(data, "destination") || null,
        estimatedDeliveryAt: field(
          data,
          "estimatedDeliveryAt",
        )
          ? new Date(field(data, "estimatedDeliveryAt"))
          : null,
        actualDeliveryAt:
          status === "DELIVERED"
            ? new Date()
            : undefined,
        supplierEmail: user.email ?? null,
        notes: field(data, "notes") || null,
        proofOfDeliveryRef:
          field(data, "proofOfDeliveryRef") || null,
        lastStatusUpdatedAt: new Date(),
      },
      create: {
        tenantId: user.tenantId,
        supplierId: supplier.id,
        shipmentReference,
        purchaseOrderRef:
          field(data, "purchaseOrderRef") || null,
        trackingNumber:
          field(data, "trackingNumber") || null,
        carrierName:
          field(data, "carrierName") || null,
        status,
        origin: field(data, "origin") || null,
        destination: field(data, "destination") || null,
        estimatedDeliveryAt: field(
          data,
          "estimatedDeliveryAt",
        )
          ? new Date(field(data, "estimatedDeliveryAt"))
          : null,
        actualDeliveryAt:
          status === "DELIVERED" ? new Date() : null,
        supplierEmail: user.email ?? null,
        notes: field(data, "notes") || null,
        proofOfDeliveryRef:
          field(data, "proofOfDeliveryRef") || null,
        lastStatusUpdatedAt: new Date(),
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.shipment.submit",
      resourceType: "SupplierCollaborationShipment",
      resourceId: shipment.id,
      after: {
        supplierId: supplier.id,
        supplierNumber: supplier.supplierNumber,
        shipmentReference: shipment.shipmentReference,
        status: shipment.status,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function startSupplierConversationAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const subject = field(data, "subject");
  const body = field(data, "body");

  if (subject.length < 3) {
    throw new Error(
      "Conversation subject must contain at least 3 characters.",
    );
  }

  if (body.length < 2) {
    throw new Error("Message is required.");
  }

  const thread = await prisma.$transaction(async (tx) => {
    const createdThread =
      await tx.supplierConversationThread.create({
        data: {
          tenantId: user.tenantId,
          supplierId: supplier.id,
          subject,
          contextType:
            field(data, "contextType") || null,
          contextReference:
            field(data, "contextReference") || null,
          priority: field(data, "priority") || "NORMAL",
          supplierEmail: user.email ?? null,
          lastMessageAt: new Date(),
        },
      });

    await tx.supplierConversationMessage.create({
      data: {
        tenantId: user.tenantId,
        threadId: createdThread.id,
        senderType: "SUPPLIER",
        senderId: user.id,
        senderEmail: user.email ?? null,
        body,
        attachmentRef:
          field(data, "attachmentRef") || null,
        readBySupplierAt: new Date(),
      },
    });

    return createdThread;
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.conversation.create",
      resourceType: "SupplierConversationThread",
      resourceId: thread.id,
      after: {
        supplierId: supplier.id,
        subject: thread.subject,
        priority: thread.priority,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function replySupplierConversationAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const threadId = field(data, "threadId");
  const body = field(data, "body");

  if (!body) {
    throw new Error("Reply message is required.");
  }

  const thread =
    await prisma.supplierConversationThread.findFirstOrThrow(
      {
        where: {
          id: threadId,
          tenantId: user.tenantId,
          supplierId: supplier.id,
        },
      },
    );

  await prisma.$transaction([
    prisma.supplierConversationMessage.create({
      data: {
        tenantId: user.tenantId,
        threadId: thread.id,
        senderType: "SUPPLIER",
        senderId: user.id,
        senderEmail: user.email ?? null,
        body,
        attachmentRef:
          field(data, "attachmentRef") || null,
        readBySupplierAt: new Date(),
      },
    }),

    prisma.supplierConversationThread.update({
      where: {
        id: thread.id,
      },
      data: {
        lastMessageAt: new Date(),
      },
    }),

    prisma.supplierConversationMessage.updateMany({
      where: {
        threadId: thread.id,
        tenantId: user.tenantId,
        senderType: "BUYER",
        readBySupplierAt: null,
      },
      data: {
        readBySupplierAt: new Date(),
      },
    }),
  ]);

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.conversation.reply",
      resourceType: "SupplierConversationThread",
      resourceId: thread.id,
      after: {
        supplierId: supplier.id,
        threadId: thread.id,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function respondSupplierActionRequestAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const requestId = field(data, "requestId");
  const responseText = field(data, "responseText");
  const responseDocumentRef = field(
    data,
    "responseDocumentRef",
  );

  if (!responseText && !responseDocumentRef) {
    throw new Error(
      "Provide a response or supporting document reference.",
    );
  }

  const request =
    await prisma.supplierActionRequest.findFirstOrThrow({
      where: {
        id: requestId,
        tenantId: user.tenantId,
        supplierId: supplier.id,
      },
    });

  if (
    ["COMPLETED", "CANCELLED", "CLOSED"].includes(
      request.status,
    )
  ) {
    throw new Error(
      "This action request is no longer open for supplier response.",
    );
  }

  const updated =
    await prisma.supplierActionRequest.update({
      where: {
        id: request.id,
      },
      data: {
        responseText: responseText || null,
        responseDocumentRef:
          responseDocumentRef || null,
        respondedAt: new Date(),
        status: "RESPONDED",
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.action_request.respond",
      resourceType: "SupplierActionRequest",
      resourceId: updated.id,
      after: {
        supplierId: supplier.id,
        requestId: updated.id,
        status: updated.status,
        respondedAt: updated.respondedAt,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function acknowledgeSupplierSharedDocumentAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const documentId = field(data, "documentId");

  const document =
    await prisma.supplierSharedDocument.findFirstOrThrow({
      where: {
        id: documentId,
        tenantId: user.tenantId,
        supplierId: supplier.id,
        direction: "BUYER_TO_SUPPLIER",
      },
    });

  const updated =
    await prisma.supplierSharedDocument.update({
      where: {
        id: document.id,
      },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: user.email ?? user.id,
        status: "ACKNOWLEDGED",
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.document.acknowledge",
      resourceType: "SupplierSharedDocument",
      resourceId: updated.id,
      after: {
        supplierId: supplier.id,
        direction: updated.direction,
        status: updated.status,
        acknowledgedAt: updated.acknowledgedAt,
      },
    },
  });

  revalidateSupplierCollaboration();
}

export async function shareSupplierDocumentToBuyerAction(
  data: FormData,
) {
  const { user, supplier } = await requireSupplierActor();

  const title = field(data, "title");
  const documentRef = field(data, "documentRef");

  if (!title || !documentRef) {
    throw new Error(
      "Document title and document reference are required.",
    );
  }

  const document =
    await prisma.supplierSharedDocument.create({
      data: {
        tenantId: user.tenantId,
        supplierId: supplier.id,
        title,
        description:
          field(data, "description") || null,
        documentRef,
        documentType:
          field(data, "documentType") || null,
        direction: "SUPPLIER_TO_BUYER",
        status: "SHARED",
        sharedByUserId: user.id,
        supplierEmail: user.email ?? null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier collaboration user",
      action:
        "supplier_self_collaboration.document.share",
      resourceType: "SupplierSharedDocument",
      resourceId: document.id,
      after: {
        supplierId: supplier.id,
        documentRef: document.documentRef,
        direction: document.direction,
        status: document.status,
      },
    },
  });

  revalidateSupplierCollaboration();
}