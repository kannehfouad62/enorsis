import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TenantStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function getPlatformTenantContextWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    redirect("/app/unauthorized");
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      status: TenantStatus.ACTIVE,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      legalName: true,
      commercialPersona: true,
      countryCode: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    session,
    tenants,
    activeTenant:
      tenants.find((tenant) => tenant.id === session.user.tenantId) ?? null,
  };
}
