"use server";

import { redirect } from "next/navigation";

import { auth, unstable_update } from "@/auth";
import { TenantStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function switchPlatformTenantContextAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    redirect("/app/unauthorized");
  }

  const targetTenantId = String(formData.get("tenantId") ?? "").trim();

  if (!targetTenantId) {
    throw new Error("Select a tenant context.");
  }

  const targetTenant = await prisma.tenant.findFirst({
    where: {
      id: targetTenantId,
      status: TenantStatus.ACTIVE,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      commercialPersona: true,
    },
  });

  if (!targetTenant) {
    throw new Error("The selected tenant is not active or does not exist.");
  }

  const previousTenantId = session.user.tenantId;
  const previousTenantName = session.user.tenantName;

  await prisma.auditEvent.create({
    data: {
      tenantId: targetTenant.id,
      userId:
        session.user.id === "development-platform-admin"
          ? null
          : session.user.id,
      actorType: "USER",
      actorId: session.user.id,
      actorLabel:
        session.user.email ?? "Enorsis platform super administrator",
      action: "platform.tenant_context.switch",
      resourceType: "Tenant",
      resourceId: targetTenant.id,
      before: {
        tenantId: previousTenantId,
        tenantName: previousTenantName,
      },
      after: {
        tenantId: targetTenant.id,
        tenantName: targetTenant.name,
        commercialPersona: targetTenant.commercialPersona,
      },
    },
  });

  await unstable_update({
    user: {
      ...session.user,
      tenantId: targetTenant.id,
      tenantSlug: targetTenant.slug,
      tenantName: targetTenant.name,
      membershipId: `platform-context:${targetTenant.id}`,
      approvalLimitUsd: null,
      legalEntityScopeIds: [],
      siteScopeIds: [],
      departmentScopeIds: [],
    },
  });

  redirect("/app");
}
