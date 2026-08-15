import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPurchasingWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [orders, approvedRequests, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        supplier: true,
        purchaseRequest: true,
        receipts: true,
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseRequest.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "APPROVED",
        purchaseOrders: { none: {} },
      },
      orderBy: { approvedAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "APPROVED",
      },
      orderBy: { legalName: "asc" },
    }),
  ]);

  return { session, orders, approvedRequests, suppliers };
}

export async function getPurchaseOrderDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      supplier: true,
      purchaseRequest: true,
      lines: { orderBy: { lineNumber: "asc" } },
      receipts: {
        include: { lines: true },
        orderBy: { receivedAt: "desc" },
      },
      invoices: {
        orderBy: { invoiceDate: "desc" },
      },
    },
  });

  if (!order) redirect("/app/purchasing/orders");
  return { session, order };
}

export async function getInvoiceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId: session.user.tenantId,
      NOT: {
        status: "DRAFT",
        sourceMarketplaceOrderId: { not: null },
      },
    },
    include: {
      supplier: true,
      purchaseOrder: true,
      exceptions: {
        where: { status: "OPEN" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { session, invoices };
}

export async function getInvoiceDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoice = await prisma.supplierInvoice.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      NOT: {
        status: "DRAFT",
        sourceMarketplaceOrderId: { not: null },
      },
    },
    include: {
      supplier: true,
      purchaseOrder: true,
      lines: {
        include: {
          purchaseOrderLine: true,
        },
        orderBy: { lineNumber: "asc" },
      },
      exceptions: {
        orderBy: [{ status: "asc" }, { severity: "desc" }],
      },
    },
  });

  if (!invoice) redirect("/app/purchasing/invoices");
  return { session, invoice };
}
