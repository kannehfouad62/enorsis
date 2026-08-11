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

  return { orders };
}
