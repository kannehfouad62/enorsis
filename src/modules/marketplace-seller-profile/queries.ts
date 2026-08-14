import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { prisma } from "@/lib/prisma";

const SELLER_PERSONAS = new Set([
  "SUPPLIER",
  "BUYER_SUPPLIER",
]);

export async function getMarketplaceSellerProfile() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      name: true,
      legalName: true,
      countryCode: true,
      commercialPersona: true,
      sites: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          name: true,
          city: true,
          region: true,
          countryCode: true,
          addressLine1: true,
          addressLine2: true,
          postalCode: true,
        },
      },
    },
  });

  if (
    !tenant ||
    !SELLER_PERSONAS.has(tenant.commercialPersona)
  ) {
    redirect("/app/unauthorized");
  }

  const supplier =
    await ensureTenantSelfSupplierProfile({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
    });

  return {
    session,
    tenant,
    supplier,
    location: tenant.sites[0] ?? null,
  };
}
