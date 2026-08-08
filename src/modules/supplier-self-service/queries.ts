import { requireSupplierPortalAccess } from "@/core/supplier-portal/access";
import { prisma } from "@/lib/prisma";

export async function getSupplierSelfServiceWorkspace(
  token: string,
) {
  const access = await requireSupplierPortalAccess(token);

  const [
    invoices,
    shipments,
    threads,
    tasks,
    questionnaires,
  ] = await Promise.all([
    prisma.supplierCollaborationInvoice.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    prisma.supplierCollaborationShipment.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      orderBy: { lastStatusUpdatedAt: "desc" },
      take: 50,
    }),
    prisma.supplierConversationThread.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 30,
    }),
    prisma.supplierPortalTask.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
        OR: [
          { supplierOwnerEmail: null },
          {
            supplierOwnerEmail:
              access.portalUser.email,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.supplierOnboardingQuestionnaire.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return {
    ...access,
    invoices,
    shipments,
    threads,
    tasks,
    questionnaires,
  };
}
