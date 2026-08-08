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
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getSupplierCollaborationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [
    suppliers,
    invoices,
    shipments,
    threads,
    invoiceCount,
    shipmentCount,
    openThreadCount,
  ] = await Promise.all([
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
    prisma.supplierCollaborationInvoice.findMany({
      where: { tenantId },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    prisma.supplierCollaborationShipment.findMany({
      where: { tenantId },
      orderBy: { lastStatusUpdatedAt: "desc" },
      take: 50,
    }),
    prisma.supplierConversationThread.findMany({
      where: { tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 30,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 30,
    }),
    prisma.supplierCollaborationInvoice.count({
      where: { tenantId, status: "SUBMITTED" },
    }),
    prisma.supplierCollaborationShipment.count({
      where: {
        tenantId,
        status: {
          notIn: ["DELIVERED", "CANCELLED"],
        },
      },
    }),
    prisma.supplierConversationThread.count({
      where: { tenantId, status: "OPEN" },
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  return {
    suppliers,
    invoices: invoices.map((item) => ({
      ...item,
      supplier: supplierMap.get(item.supplierId) ?? null,
    })),
    shipments: shipments.map((item) => ({
      ...item,
      supplier: supplierMap.get(item.supplierId) ?? null,
    })),
    threads: threads.map((item) => ({
      ...item,
      supplier: supplierMap.get(item.supplierId) ?? null,
    })),
    metrics: {
      submittedInvoices: invoiceCount,
      activeShipments: shipmentCount,
      openThreads: openThreadCount,
    },
  };
}
