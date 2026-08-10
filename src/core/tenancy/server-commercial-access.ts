import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { TenantCommercialPersonaValue } from "./commercial-persona";

const platformRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function requireTenantCommercialPersona(
  allowed: readonly TenantCommercialPersonaValue[],
) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (session.user.roles.some((role) => platformRoles.has(role))) {
    return;
  }

  if (!session.user.tenantId) {
    redirect("/app/unauthorized");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { commercialPersona: true },
  });

  if (
    !tenant ||
    !allowed.includes(
      tenant.commercialPersona as TenantCommercialPersonaValue,
    )
  ) {
    redirect("/app/unauthorized?reason=commercial-persona");
  }
}
