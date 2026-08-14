import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getWarehouseOperationsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [sessions, locations, tasks, discrepancies, marketplaceOrders] =
    await Promise.all([
    prisma.warehouseReceivingSession.findMany({
      where: { tenantId },
      include: {
        lines: true,
        putawayTasks: true,
        discrepancies: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.warehouseLocationControl.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.putawayTask.findMany({
      where: { tenantId },
      include: {
        receiptLine: true,
        destinationControl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.warehouseDiscrepancy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.marketplaceSellerOrder.findMany({
      where: {
        buyerTenantId: tenantId,
        status: { in: ["ACCEPTED", "SHIPPED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const sellerTenantIds = [
    ...new Set(
      marketplaceOrders.map((order) => order.sellerTenantId),
    ),
  ];

  const sellerTenants = sellerTenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: sellerTenantIds } },
        select: { id: true, name: true },
      })
    : [];

  const sellerNameById = new Map(
    sellerTenants.map((tenant) => [tenant.id, tenant.name]),
  );

  const marketplaceInboundLines = marketplaceOrders.flatMap((order) => {
    const lines = Array.isArray(order.lineSnapshot)
      ? order.lineSnapshot
      : [];

    return lines.flatMap((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const line = raw as Record<string, unknown>;

      const offeringId =
        typeof line.offeringId === "string"
          ? line.offeringId
          : `line-${index + 1}`;
      const offeringName =
        typeof line.offeringName === "string"
          ? line.offeringName
          : "Marketplace product";
      const quantity = Number(line.quantity ?? 0);
      const unitPrice = Number(line.unitPrice ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) return [];

      return [{
        key: `${order.id}:${offeringId}:${index}`,
        orderId: order.id,
        orderNumber: order.orderNumber ?? order.id,
        purchaseRequestId: order.purchaseRequestId,
        purchaseOrderExecutionId:
          order.purchaseOrderExecutionId,
        buyerSupplierId: order.buyerSupplierId,
        sellerTenantId: order.sellerTenantId,
        sellerName:
          sellerNameById.get(order.sellerTenantId) ?? null,
        status: order.status,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        expectedDeliveryAt:
          order.expectedDeliveryAt?.toISOString() ?? null,
        offeringId,
        offeringName,
        sku:
          typeof line.sku === "string" ? line.sku : null,
        quantity,
        unitOfMeasure:
          typeof line.unitOfMeasure === "string"
            ? line.unitOfMeasure
            : "EA",
        unitPrice:
          Number.isFinite(unitPrice) ? unitPrice : 0,
        currencyCode:
          typeof line.currencyCode === "string"
            ? line.currencyCode
            : order.currencyCode,
      }];
    });
  });

  return {
    sessions,
    locations,
    tasks,
    discrepancies,
    marketplaceInboundLines,
  };
}
