"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAuditRequestContext } from "@/core/audit/request-context";
import { auditTenantAccess } from "@/core/access-governance/tenant-role-audit";
import { issueTenantUserActivationInvitation } from "@/core/tenant-user-activation/service";
import { issueTenantOwnerActivationInvitation } from "@/core/tenant-owner-activation/service";
import {
  CurrencyPolicyMode,
  MembershipStatus,
  PlatformRole,
  TenantStatus,
  TenantCommercialPersona,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  assignPlatformTenantOwnerSchema,
  createPlatformTenantSchema,
  updatePlatformTenantStatusSchema,
  updatePlatformTenantCommercialPersonaSchema,
  updatePlatformTenantMemberRolesSchema,
} from "./schemas";

async function requirePlatformSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    throw new Error("Authentication is required.");
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    throw new Error("Platform Super Admin access is required.");
  }

  return {
    ...session.user,
    id: session.user.id,
    email: session.user.email,
  };
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function createPlatformTenantAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = createPlatformTenantSchema.parse({
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    commercialPersona: value(formData, "commercialPersona"),
    slug: value(formData, "slug"),
    countryCode: value(formData, "countryCode"),
    defaultLocale: value(formData, "defaultLocale") || "en-US",
    defaultTimeZone: value(formData, "defaultTimeZone") || "UTC",
    currencyPolicyMode: value(formData, "currencyPolicyMode"),
    baseCurrencyCode: value(formData, "baseCurrencyCode"),
    localDisplayCurrency: value(formData, "localDisplayCurrency") || undefined,
    ownerName: value(formData, "ownerName"),
    ownerEmail: value(formData, "ownerEmail"),
    activateImmediately: checked(formData, "activateImmediately"),
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingSlug = await tx.tenant.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new Error("A tenant with this slug already exists.");
    }

    const tenant = await tx.tenant.create({
      data: {
        slug: input.slug,
        name: input.name,
        legalName: input.legalName,
        commercialPersona:
          input.commercialPersona as TenantCommercialPersona,
        status: input.activateImmediately
          ? TenantStatus.ACTIVE
          : TenantStatus.PROVISIONING,
        countryCode: input.countryCode,
        defaultLocale: input.defaultLocale,
        defaultTimeZone: input.defaultTimeZone,
        currencyPolicyMode:
          input.currencyPolicyMode as CurrencyPolicyMode,
        baseCurrencyCode: input.baseCurrencyCode,
        localDisplayCurrency:
          input.currencyPolicyMode === "USD_WITH_LOCAL_DISPLAY"
            ? input.localDisplayCurrency ?? null
            : null,
        usdReportingEnabled: true,
      },
    });

    const owner = await tx.user.upsert({
      where: { email: input.ownerEmail },
      update: {
        name: input.ownerName,
        isActive: true,
      },
      create: {
        email: input.ownerEmail,
        name: input.ownerName,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    const ownerNeedsActivation = !owner.passwordHash;

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: owner.id,
        },
      },
      update: {
        status: ownerNeedsActivation
          ? MembershipStatus.INVITED
          : MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: ownerNeedsActivation ? null : new Date(),
        invitedByUserId: actor.id,
      },
      create: {
        tenantId: tenant.id,
        userId: owner.id,
        status: ownerNeedsActivation
          ? MembershipStatus.INVITED
          : MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: ownerNeedsActivation ? null : new Date(),
        invitedByUserId: actor.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: actor.id,
        actorType: "USER",
        actorId: actor.id,
        actorLabel: actor.email,
        action: "platform.tenant.create",
        resourceType: "Tenant",
        resourceId: tenant.id,
        after: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          countryCode: tenant.countryCode,
          ownerEmail: input.ownerEmail,
        },
      },
    });

    return {
      tenant,
      owner,
      ownerNeedsActivation,
    };
  });

  if (result.ownerNeedsActivation) {
    await issueTenantOwnerActivationInvitation({
      tenantId: result.tenant.id,
      userId: result.owner.id,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });
  }

  revalidatePath("/app/settings/tenants");
  redirect(`/app/settings/tenants/${result.tenant.id}`);
}

export async function updatePlatformTenantStatusAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = updatePlatformTenantStatusSchema.parse({
    tenantId: value(formData, "tenantId"),
    status: value(formData, "status"),
  });

  if (actor.tenantId === input.tenantId && input.status === "SUSPENDED") {
    throw new Error("You cannot suspend the tenant backing your current authenticated session.");
  }

  const before = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { status: true },
  });

  const updated = await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      status: input.status as TenantStatus,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: updated.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.status.update",
      resourceType: "Tenant",
      resourceId: updated.id,
      before,
      after: { status: updated.status },
    },
  });

  revalidatePath("/app/settings/tenants");
  revalidatePath(`/app/settings/tenants/${updated.id}`);
}

export async function assignPlatformTenantOwnerAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = assignPlatformTenantOwnerSchema.parse({
    tenantId: value(formData, "tenantId"),
    ownerName: value(formData, "ownerName"),
    ownerEmail: value(formData, "ownerEmail"),
  });

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: input.tenantId },
      select: { id: true, name: true },
    });

    const user = await tx.user.upsert({
      where: { email: input.ownerEmail },
      update: {
        name: input.ownerName,
        isActive: true,
      },
      create: {
        email: input.ownerEmail,
        name: input.ownerName,
        isActive: true,
      },
    });

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: actor.id,
        actorType: "USER",
        actorId: actor.id,
        actorLabel: actor.email,
        action: "platform.tenant.owner.assign",
        resourceType: "Tenant",
        resourceId: tenant.id,
        after: {
          tenantName: tenant.name,
          ownerEmail: input.ownerEmail,
        },
      },
    });
  });

  revalidatePath(`/app/settings/tenants/${input.tenantId}`);
}


export async function resendTenantOwnerActivationAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");

  if (!tenantId) {
    throw new Error("Tenant is required.");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      roles: { has: PlatformRole.TENANT_OWNER },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new Error(
      "No Tenant Owner membership exists for this tenant.",
    );
  }

  if (membership.user.passwordHash) {
    throw new Error(
      "The Tenant Owner already has login credentials.",
    );
  }

  await issueTenantOwnerActivationInvitation({
    tenantId,
    userId: membership.user.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
  });

  revalidatePath(
    `/app/settings/tenants/${tenantId}`,
  );
}


export async function sendTenantMemberActivationAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");
  const userId = value(formData, "userId");

  if (!tenantId || !userId) {
    throw new Error("Tenant and user are required.");
  }

  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("The selected user is not a member of this tenant.");
  }

  if (membership.user.passwordHash) {
    throw new Error("This user already has login credentials.");
  }

  if (membership.roles.length === 0) {
    throw new Error(
      "Assign at least one tenant role before sending the activation invitation.",
    );
  }

  if (
    membership.roles.includes(PlatformRole.PLATFORM_SUPER_ADMIN) ||
    membership.roles.includes(PlatformRole.PLATFORM_SUPPORT)
  ) {
    throw new Error(
      "Platform-level roles cannot be activated through tenant member provisioning.",
    );
  }

  await issueTenantUserActivationInvitation({
    tenantId,
    userId,
    actorUserId: actor.id,
    actorEmail: actor.email,
  });

  revalidatePath(`/app/settings/tenants/${tenantId}`);
}


export async function updatePlatformTenantCommercialPersonaAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = updatePlatformTenantCommercialPersonaSchema.parse({
    tenantId: value(formData, "tenantId"),
    commercialPersona: value(formData, "commercialPersona"),
  });

  const before = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { commercialPersona: true, name: true },
  });

  const updated = await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      commercialPersona:
        input.commercialPersona as TenantCommercialPersona,
    },
    select: { id: true, name: true, commercialPersona: true },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: updated.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.commercial-persona.update",
      resourceType: "Tenant",
      resourceId: updated.id,
      before: {
        name: before.name,
        commercialPersona: before.commercialPersona,
      },
      after: {
        name: updated.name,
        commercialPersona: updated.commercialPersona,
      },
    },
  });

  revalidatePath("/app/settings/tenants");
  revalidatePath(`/app/settings/tenants/${updated.id}`);
}


export async function updatePlatformTenantMemberRolesAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const roleAuditContext = await getAuditRequestContext();

  const input = updatePlatformTenantMemberRolesSchema.parse({
    tenantId: value(formData, "tenantId"),
    userId: value(formData, "userId"),
    roles: formData.getAll("roles").map((role) => String(role)),
  });

  const membership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!membership) {
    throw new Error("The selected user is not a member of this tenant.");
  }

  if (membership.roles.includes(PlatformRole.TENANT_OWNER)) {
    throw new Error(
      "Tenant Owner roles are managed through the Tenant Owner controls.",
    );
  }

  const updated = await prisma.membership.update({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    data: {
      roles: input.roles as PlatformRole[],
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      ...roleAuditContext,
      action: "platform.tenant.member.roles.update",
      resourceType: "Membership",
      resourceId: membership.id,
      before: { roles: membership.roles },
      after: {
        roles: updated.roles,
        memberEmail: membership.user.email,
      },
    },
  });

  revalidatePath(`/app/settings/tenants/${input.tenantId}`);
}


export async function runPlatformTenantAccessAuditAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");

  if (!tenantId) {
    throw new Error("Tenant is required.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      commercialPersona: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              passwordHash: true,
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    throw new Error("Tenant was not found.");
  }

  const audit = auditTenantAccess({
    commercialPersona: tenant.commercialPersona,
    members: tenant.memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      status: membership.status,
      roles: membership.roles,
      hasPassword: Boolean(membership.user.passwordHash),
    })),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.access-role.audit",
      resourceType: "Tenant",
      resourceId: tenant.id,
      after: {
        tenantName: tenant.name,
        commercialPersona: tenant.commercialPersona,
        reviewed: audit.reviewed,
        passed: audit.passed,
        warnings: audit.warnings,
        failed: audit.failed,
        results: audit.results.map((result) => ({
          userId: result.userId,
          email: result.email,
          status: result.status,
          roles: result.roles,
          severity: result.severity,
          findings: result.findings,
        })),
      },
    },
  });

  revalidatePath(`/app/settings/tenants/${tenant.id}`);
}
