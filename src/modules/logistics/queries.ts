import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getLogisticsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [carriers, shipments, suppliers, marketplaceOrders] =
    await Promise.all([
    prisma.logisticsCarrier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.logisticsShipment.findMany({
      where: { tenantId },
      include: {
        carrier: true,
        events: { orderBy: { occurredAt: "desc" } },
      },
      orderBy: [
        { status: "asc" },
        { estimatedDeliveryAt: "asc" },
      ],
      take: 200,
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
    prisma.marketplaceSellerOrder.findMany({
      where: {
        sellerTenantId: tenantId,
        status: "ACCEPTED",
      },
      select: {
        id: true,
        orderNumber: true,
        buyerTenantName: true,
        purchaseOrderExecutionId: true,
        currencyCode: true,
        totalAmount: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: [
        { acceptedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
  ]);

  const now = new Date();

  return {
    carriers,
    shipments,
    suppliers,
    marketplaceOrders,
    metrics: {
      activeShipments: shipments.filter((item) =>
        ["BOOKED", "IN_TRANSIT", "DELAYED"].includes(item.status),
      ).length,
      delayedShipments: shipments.filter(
        (item) => item.status === "DELAYED",
      ).length,
      overdueDeliveries: shipments.filter(
        (item) =>
          item.estimatedDeliveryAt &&
          item.estimatedDeliveryAt < now &&
          item.status !== "DELIVERED",
      ).length,
      freightSpend: shipments.reduce(
        (sum, item) => sum + Number(item.freightCost ?? 0),
        0,
      ),
      highRiskShipments: shipments.filter(
        (item) => item.delayRiskPercent >= 70,
      ).length,
      deliveredWithoutPod: shipments.filter(
        (item) =>
          item.status === "DELIVERED" &&
          !item.proofOfDeliveryUrl,
      ).length,
    },
  };
}
