import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requirePlatformSuperAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    redirect("/app/unauthorized");
  }

  return session.user;
}

export async function getPlatformTenantDirectory() {
  await requirePlatformSuperAdmin();

  const tenants = await prisma.tenant.findMany({
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
      _count: {
        select: {
          legalEntities: true,
          sites: true,
          departments: true,
          memberships: true,
          suppliers: true,
          purchaseRequests: true,
          purchaseOrders: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return {
    tenants,
    metrics: {
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === "ACTIVE").length,
      provisioning: tenants.filter((tenant) => tenant.status === "PROVISIONING").length,
      suspended: tenants.filter((tenant) => tenant.status === "SUSPENDED").length,
      archived: tenants.filter((tenant) => tenant.status === "ARCHIVED").length,
    },
  };
}

export async function getPlatformTenantDetail(tenantId: string) {
  await requirePlatformSuperAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      legalEntities: {
        orderBy: { name: "asc" },
      },
      sites: {
        orderBy: { name: "asc" },
      },
      departments: {
        orderBy: { name: "asc" },
      },
      subscriptions: true,
      entitlements: true,
      configurationProfile: true,
      _count: {
        select: {
          suppliers: true,
          purchaseRequests: true,
          purchaseOrders: true,
          supplierInvoices: true,
          paymentBatches: true,
          inventoryItems: true,
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  return tenant;
}
