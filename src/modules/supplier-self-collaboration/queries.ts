import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { prisma } from "@/lib/prisma";

const SELLER_PERSONAS = new Set(["SUPPLIER", "BUYER_SUPPLIER"]);

export async function getSupplierSelfCollaborationWorkspace() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenantId = session.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      commercialPersona: true,
    },
  });

  if (!tenant || !SELLER_PERSONAS.has(tenant.commercialPersona)) {
    redirect("/app/unauthorized");
  }

  const supplier = await ensureTenantSelfSupplierProfile({
    tenantId,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
  });

  const [
    invoices,
    shipments,
    threads,
    actionRequests,
    sharedDocuments,
  ] = await Promise.all([
    prisma.supplierCollaborationInvoice.findMany({
      where: {
        tenantId,
        supplierId: supplier.id,
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 100,
    }),

    prisma.supplierCollaborationShipment.findMany({
      where: {
        tenantId,
        supplierId: supplier.id,
      },
      orderBy: {
        lastStatusUpdatedAt: "desc",
      },
      take: 100,
    }),

    prisma.supplierConversationThread.findMany({
      where: {
        tenantId,
        supplierId: supplier.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          take: 100,
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      take: 50,
    }),

    prisma.supplierActionRequest.findMany({
      where: {
        tenantId,
        supplierId: supplier.id,
      },
      orderBy: {
        requestedAt: "desc",
      },
      take: 100,
    }),

    prisma.supplierSharedDocument.findMany({
      where: {
        tenantId,
        supplierId: supplier.id,
      },
      orderBy: {
        sharedAt: "desc",
      },
      take: 100,
    }),
  ]);

  const activeShipments = shipments.filter(
    (shipment) =>
      !["DELIVERED", "CANCELLED"].includes(shipment.status),
  ).length;

  const openThreads = threads.filter(
    (thread) => thread.status === "OPEN",
  ).length;

  const unreadBuyerMessages = threads.reduce(
    (count, thread) =>
      count +
      thread.messages.filter(
        (message) =>
          message.senderType === "BUYER" &&
          !message.readBySupplierAt,
      ).length,
    0,
  );

  const openActionRequests = actionRequests.filter(
    (request) =>
      !["COMPLETED", "CANCELLED", "CLOSED"].includes(
        request.status,
      ),
  ).length;

  const buyerDocuments = sharedDocuments.filter(
    (document) => document.direction === "BUYER_TO_SUPPLIER",
  );

  const unacknowledgedBuyerDocuments = buyerDocuments.filter(
    (document) => !document.acknowledgedAt,
  ).length;

  return {
    tenant,
    session,
    supplier,
    invoices,
    shipments,
    threads,
    actionRequests,
    sharedDocuments,
    buyerDocuments,
    metrics: {
      submittedInvoices: invoices.length,
      activeShipments,
      openThreads,
      unreadBuyerMessages,
      openActionRequests,
      unacknowledgedBuyerDocuments,
    },
  };
}