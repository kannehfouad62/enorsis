import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set(["TENANT_OWNER","TENANT_ADMIN","FINANCE","ACCOUNTS_PAYABLE","PLATFORM_SUPER_ADMIN","PLATFORM_SUPPORT"]);

export async function getPaymentOperationsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.roles.some((role) => allowedRoles.has(role))) redirect("/app/unauthorized");

  const tenantId = session.user.tenantId;
  const [readyCases, batches] = await Promise.all([
    prisma.apPaymentReadinessCase.findMany({
      where: { tenantId, status: "APPROVED", paymentBatchId: null },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.paymentBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const batchIds = batches.map((batch) => batch.id);
  const items = batchIds.length
    ? await prisma.paymentBatchItem.findMany({
        where: { paymentBatchId: { in: batchIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const invoiceIds = [...new Set(items.map((item) => item.supplierInvoiceId))];
  const invoices = invoiceIds.length
    ? await prisma.supplierInvoice.findMany({
        where: { tenantId, id: { in: invoiceIds } },
        select: {
          id: true, invoiceNumber: true, supplierId: true, status: true,
          totalAmount: true, currencyCode: true, dueDate: true, paidAt: true,
        },
      })
    : [];

  const supplierIds = [...new Set(invoices.map((invoice) => invoice.supplierId))];
  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, legalName: true },
      })
    : [];

  return { userRoles: session.user.roles, readyCases, batches, items, invoices, suppliers };
}
