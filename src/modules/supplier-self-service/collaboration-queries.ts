import { requireSupplierPortalAccess } from "@/core/supplier-portal/access";
import { prisma } from "@/lib/prisma";

export async function getSupplierExternalCollaborationWorkspace(
  token: string,
) {
  const access = await requireSupplierPortalAccess(token);

  const [documents, requests] = await Promise.all([
    prisma.supplierSharedDocument.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      orderBy: { sharedAt: "desc" },
      take: 100,
    }),
    prisma.supplierActionRequest.findMany({
      where: {
        tenantId: access.supplier.tenantId,
        supplierId: access.supplier.id,
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    ...access,
    documents,
    requests,
  };
}
