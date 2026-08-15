import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMarketplaceCartCheckoutContext() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      legalEntities: { orderBy: { name: "asc" } },
      sites: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" } },
      memberships: {
        where: {
          status: "ACTIVE",
          roles: { has: "APPROVER" },
          approvalLimitUsd: { not: null },
          userId: { not: session.user.id },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { approvalLimitUsd: "asc" },
      },
    },
  });

  if (!tenant) redirect("/app/settings/organization");
  if (tenant.commercialPersona === "SUPPLIER") redirect("/app/unauthorized");

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      baseCurrencyCode: tenant.baseCurrencyCode,
      legalEntities: tenant.legalEntities.map((item) => ({ id: item.id, name: item.name })),
      sites: tenant.sites.map((item) => ({ id: item.id, name: item.name })),
      departments: tenant.departments.map((item) => ({ id: item.id, name: item.name })),
      approvers: tenant.memberships.map((membership) => ({
        userId: membership.userId,
        name: membership.user.name ?? membership.user.email,
        email: membership.user.email,
        approvalLimitUsd:
          membership.approvalLimitUsd == null
            ? null
            : Number(membership.approvalLimitUsd),
      })),
    },
  };
}

export async function getMarketplaceSellerOrders() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { commercialPersona: true },
  });

  if (!tenant || !["SUPPLIER", "BUYER_SUPPLIER"].includes(tenant.commercialPersona)) {
    redirect("/app/unauthorized");
  }

  const orders = await prisma.marketplaceSellerOrder.findMany({
    where: { sellerTenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const purchaseOrderExecutionIds = orders
    .map((order) => order.purchaseOrderExecutionId)
    .filter((id): id is string => Boolean(id));

  const shipments = purchaseOrderExecutionIds.length
    ? await prisma.logisticsShipment.findMany({
        where: {
          tenantId: session.user.tenantId,
          purchaseOrderId: {
            in: purchaseOrderExecutionIds,
          },
        },
        include: {
          carrier: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  const generatedInvoices = orders.length
    ? await prisma.supplierInvoice.findMany({
        where: {
          generatedBySellerTenantId: session.user.tenantId,
          sourceMarketplaceOrderId: {
            in: orders.map((order) => order.id),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  const invoiceByMarketplaceOrderId = new Map(
    generatedInvoices.map((invoice) => [
      invoice.sourceMarketplaceOrderId,
      invoice,
    ]),
  );

  const shipmentByPurchaseOrderId = new Map<
    string,
    (typeof shipments)[number]
  >();

  for (const shipment of shipments) {
    if (
      shipment.purchaseOrderId &&
      !shipmentByPurchaseOrderId.has(
        shipment.purchaseOrderId,
      )
    ) {
      shipmentByPurchaseOrderId.set(
        shipment.purchaseOrderId,
        shipment,
      );
    }
  }

  return {
    orders: orders.map((order) => ({
      ...order,
      logisticsShipment:
        order.purchaseOrderExecutionId
          ? shipmentByPurchaseOrderId.get(
              order.purchaseOrderExecutionId,
            ) ?? null
          : null,
      generatedInvoice:
        invoiceByMarketplaceOrderId.get(order.id) ?? null,
    })),
  };
}
