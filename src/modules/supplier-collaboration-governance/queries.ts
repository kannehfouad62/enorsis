import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
]);

export async function getSupplierCollaborationRequestsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [suppliers, documents, requests] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
      },
      orderBy: { legalName: "asc" },
      take: 500,
    }),
    prisma.supplierSharedDocument.findMany({
      where: { tenantId },
      orderBy: { sharedAt: "desc" },
      take: 100,
    }),
    prisma.supplierActionRequest.findMany({
      where: { tenantId },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  return {
    suppliers,
    documents: documents.map((item) => ({
      ...item,
      supplier: supplierMap.get(item.supplierId) ?? null,
    })),
    requests: requests.map((item) => ({
      ...item,
      supplier: supplierMap.get(item.supplierId) ?? null,
    })),
  };
}
